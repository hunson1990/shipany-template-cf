import { eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import { deviceFingerprint, deviceFingerprintCheck } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type DeviceFingerprint = typeof deviceFingerprint.$inferSelect;
export type NewDeviceFingerprint = Omit<typeof deviceFingerprint.$inferInsert, 'id'>;
export type DeviceFingerprintCheck = typeof deviceFingerprintCheck.$inferSelect;
export type NewDeviceFingerprintCheck = Omit<typeof deviceFingerprintCheck.$inferInsert, 'id'>;

// 插入设备指纹记录
export async function insertDeviceFingerprint(data: NewDeviceFingerprint) {
  const [result] = await db()
    .insert(deviceFingerprint)
    .values({
      id: getUuid(),
      ...data,
    })
    .returning();

  return result;
}

// 根据指纹哈希查找设备记录
export async function findDeviceFingerprintByHash(fingerprintHash: string) {
  const [result] = await db()
    .select()
    .from(deviceFingerprint)
    .where(eq(deviceFingerprint.fingerprintHash, fingerprintHash));

  return result;
}

// 插入设备指纹检查记录
export async function insertDeviceFingerprintCheck(data: NewDeviceFingerprintCheck) {
  const [result] = await db()
    .insert(deviceFingerprintCheck)
    .values({
      id: getUuid(),
      ...data,
    })
    .returning();

  return result;
}

// 检查设备指纹是否已获得过积分
export async function checkDeviceFingerprintCredits(fingerprintHash: string) {
  const [result] = await db()
    .select()
    .from(deviceFingerprintCheck)
    .where(
      and(
        eq(deviceFingerprintCheck.fingerprintHash, fingerprintHash),
        eq(deviceFingerprintCheck.creditsGranted, true)
      )
    );

  return result;
}


