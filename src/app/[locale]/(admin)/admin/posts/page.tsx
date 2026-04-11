import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Card, CardContent } from '@/shared/components/ui/card';
import { getPosts, getPostsCount, PostType, PostStatus } from '@/shared/models/post';
import { getTaxonomies } from '@/shared/models/taxonomy';
import { Button, Crumb } from '@/shared/types/blocks/common';

import { PostsTable } from './posts-table';

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read posts
  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const t = await getTranslations('admin.posts');

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.posts'), is_active: true },
  ];

  const total = await getPostsCount({
    type: PostType.ARTICLE,
    status: PostStatus.PUBLISHED,
  });

  const posts = await getPosts({
    type: PostType.ARTICLE,
    status: PostStatus.PUBLISHED,
    page,
    limit,
  });

  // Get categories for each post
  const postsWithCategories = await Promise.all(
    posts.map(async (post) => {
      if (!post.categories) {
        return { ...post, categoriesNames: '-' };
      }
      const categoriesIds = post.categories.split(',');
      const categories = await getTaxonomies({
        ids: categoriesIds,
      });
      const categoriesNames = categories?.map((c) => c.title).join(', ') || '-';
      return { ...post, categoriesNames };
    })
  );

  const actions: Button[] = [
    {
      id: 'add',
      title: t('list.buttons.add'),
      icon: 'RiAddLine',
      url: '/admin/posts/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} />
        <Card>
          <CardContent className="p-0">
            <PostsTable
              posts={postsWithCategories.map((post) => ({
                id: post.id,
                title: post.title || '',
                slug: post.slug || '',
                authorName: post.authorName || '',
                image: post.image || '',
                categories: post.categoriesNames,
                createdAt: post.createdAt,
              }))}
              editLabel={t('list.buttons.edit')}
              viewLabel={t('list.buttons.view')}
              deleteLabel={t('list.buttons.delete')}
              cancelLabel={t('delete.cancel')}
              confirmLabel={t('delete.confirm')}
              deleteTitle={t('delete.title')}
              deleteDescription={t.raw('delete.description')}
            />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
