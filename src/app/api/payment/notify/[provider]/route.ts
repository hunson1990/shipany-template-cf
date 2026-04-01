import {
  PaymentEventType,
  SubscriptionCycleType,
} from '@/extensions/payment/types';
import {
  findOrderByOrderNo,
  findOrderByTransactionId,
} from '@/shared/models/order';
import { findSubscriptionByProviderSubscriptionId } from '@/shared/models/subscription';
import {
  getPaymentService,
  handleCheckoutSuccess,
  handleSubscriptionCanceled,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
} from '@/shared/services/payment';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  let provider = '';

  try {
    const providerParams = await params;
    provider = providerParams.provider;

    if (!provider) {
      throw new Error('provider is required');
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(provider);
    if (!paymentProvider) {
      throw new Error('payment provider not found');
    }

    console.log('[payment-notify] request received', {
      provider,
    });

    // get payment event from webhook notification
    const event = await paymentProvider.getPaymentEvent({ req });
    if (!event) {
      throw new Error('payment event not found');
    }

    const eventType = event.eventType;
    if (!eventType) {
      throw new Error('event type not found');
    }

    // payment session
    const session = event.paymentSession;
    if (!session) {
      throw new Error('payment session not found');
    }

    const orderNo = session.metadata?.order_no;
    const subscriptionId = session.subscriptionId;
    const subscriptionCycleType = session.paymentInfo?.subscriptionCycleType;
    const transactionId = session.paymentInfo?.transactionId;

    console.log('[payment-notify] event parsed', {
      provider,
      eventType,
      orderNo,
      subscriptionId,
      subscriptionCycleType,
      transactionId,
    });

    if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
      // one-time payment or subscription first payment
      if (!orderNo) {
        throw new Error('order no not found');
      }

      console.log('[payment-notify] handling checkout success', {
        provider,
        eventType,
        orderNo,
      });

      const order = await findOrderByOrderNo(orderNo);
      if (!order) {
        throw new Error('order not found');
      }

      await handleCheckoutSuccess({
        order,
        session,
      });

      console.log('[payment-notify] checkout success handled', {
        provider,
        eventType,
        orderNo,
      });
    } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
      // handle subscription payment or one-time payment
      if (subscriptionId && session.subscriptionInfo) {
        console.log('[payment-notify] payment success for subscription', {
          provider,
          eventType,
          subscriptionId,
          subscriptionCycleType,
          transactionId,
        });

        // Find existing subscription in database
        const existingSubscription =
          await findSubscriptionByProviderSubscriptionId({
            provider: provider,
            subscriptionId: subscriptionId,
          });

        if (existingSubscription) {
          // Determine if this is a renewal or first payment
          // Method1: Use subscriptionCycleType if available (Stripe, Creem, PayPal all provide this)
          if (subscriptionCycleType) {
            if (subscriptionCycleType === SubscriptionCycleType.CREATE) {
              console.log('[payment-notify] skip first subscription payment', {
                provider,
                eventType,
                subscriptionId,
                reason: 'subscriptionCycleType=CREATE',
              });
              return Response.json({ message: 'success' });
            }

            if (subscriptionCycleType === SubscriptionCycleType.RENEWAL) {
              // Idempotency check: skip if transaction already processed
              if (transactionId) {
                const existingOrder = await findOrderByTransactionId({
                  transactionId,
                  paymentProvider: provider,
                });
                if (existingOrder) {
                  console.log(
                    '[payment-notify] skip duplicated renewal transaction',
                    {
                      provider,
                      eventType,
                      subscriptionId,
                      transactionId,
                    }
                  );
                  return Response.json({ message: 'success' });
                }
              }

              console.log('[payment-notify] handling subscription renewal', {
                provider,
                eventType,
                subscriptionId,
                transactionId,
                path: 'subscriptionCycleType=RENEWAL',
              });

              await handleSubscriptionRenewal({
                subscription: existingSubscription,
                session,
              });

              console.log('[payment-notify] subscription renewal handled', {
                provider,
                eventType,
                subscriptionId,
                transactionId,
              });

              return Response.json({ message: 'success' });
            }
          }

          // Method2: Fall back to transactionId-based idempotency check
          // If subscriptionCycleType is not available, check if this transaction already exists
          if (transactionId) {
            const existingOrder = await findOrderByTransactionId({
              transactionId,
              paymentProvider: provider,
            });
            if (existingOrder) {
              console.log(
                '[payment-notify] skip duplicated transaction fallback',
                {
                  provider,
                  eventType,
                  subscriptionId,
                  transactionId,
                }
              );
              return Response.json({ message: 'success' });
            }

            // Transaction not found - treat as renewal (subscription exists but transaction is new)
            console.log('[payment-notify] handling renewal via fallback', {
              provider,
              eventType,
              subscriptionId,
              transactionId,
              path: 'transactionId fallback',
            });

            await handleSubscriptionRenewal({
              subscription: existingSubscription,
              session,
            });

            console.log('[payment-notify] renewal via fallback handled', {
              provider,
              eventType,
              subscriptionId,
              transactionId,
            });
          } else {
            console.log('[payment-notify] cannot determine renewal', {
              provider,
              eventType,
              subscriptionId,
              reason: 'no subscriptionCycleType and no transactionId',
            });
          }
        } else {
          // Subscription not in database - this might be first payment
          // But first payment should be handled via CHECKOUT_SUCCESS or SUBSCRIBE_UPDATED
          console.log(
            '[payment-notify] subscription not found, skip payment_success handling',
            {
              provider,
              eventType,
              subscriptionId,
              subscriptionCycleType,
              transactionId,
            }
          );
        }
      } else {
        // handle one-time payment
        if (!orderNo) {
          console.log(
            '[payment-notify] one-time payment missing order_no, skip',
            {
              provider,
              eventType,
            }
          );
          return Response.json({ message: 'success' });
        }

        console.log('[payment-notify] handling one-time payment success', {
          provider,
          eventType,
          orderNo,
          transactionId,
        });

        const order = await findOrderByOrderNo(orderNo);
        if (!order) {
          throw new Error('order not found');
        }

        // handleCheckoutSuccess has idempotency check and optimistic lock
        await handleCheckoutSuccess({
          order,
          session,
        });

        console.log('[payment-notify] one-time payment success handled', {
          provider,
          eventType,
          orderNo,
          transactionId,
        });
      }
    } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
      // only handle subscription update
      if (!subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      console.log('[payment-notify] handling subscription updated', {
        provider,
        eventType,
        subscriptionId,
      });

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionUpdated({
        subscription: existingSubscription,
        session,
      });

      console.log('[payment-notify] subscription updated handled', {
        provider,
        eventType,
        subscriptionId,
      });
    } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
      // only handle subscription cancellation
      if (!subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      console.log('[payment-notify] handling subscription canceled', {
        provider,
        eventType,
        subscriptionId,
      });

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionCanceled({
        subscription: existingSubscription,
        session,
      });

      console.log('[payment-notify] subscription canceled handled', {
        provider,
        eventType,
        subscriptionId,
      });
    } else {
      console.log('[payment-notify] unhandled event type', {
        provider,
        eventType,
      });
    }

    console.log('[payment-notify] request completed', {
      provider,
      eventType,
      orderNo,
      subscriptionId,
      transactionId,
    });

    return Response.json({
      message: 'success',
    });
  } catch (err: any) {
    if (err?.message?.startsWith('Unknown Stripe event type:')) {
      console.log('[payment-notify] skip unknown event type', {
        provider,
        message: err?.message,
      });

      return Response.json({ message: 'success' });
    }

    const isStripeSignatureMismatch =
      provider === 'stripe' &&
      err?.message?.includes(
        'No signatures found matching the expected signature for payload'
      );

    if (isStripeSignatureMismatch && process.env.NODE_ENV !== 'production') {
      console.log('[payment-notify] skip invalid stripe signature in dev', {
        provider,
        message: err?.message,
      });

      return Response.json({ message: 'success' });
    }

    console.log('[payment-notify] failed', {
      provider,
      message: err?.message,
      stack: err?.stack,
    });

    return Response.json(
      {
        message: `handle payment notify failed: ${err.message}`,
      },
      {
        status: 500,
      }
    );
  }
}
