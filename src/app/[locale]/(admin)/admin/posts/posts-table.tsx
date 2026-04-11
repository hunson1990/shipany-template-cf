'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2, Loader2, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface Post {
  id: string;
  title: string;
  slug: string;
  authorName?: string;
  image?: string;
  categories?: string;
  createdAt: Date;
}

export function PostsTable({
  posts,
  editLabel,
  viewLabel,
  deleteLabel,
  cancelLabel,
  confirmLabel,
  deleteTitle,
  deleteDescription,
}: {
  posts: Post[];
  editLabel: string;
  viewLabel: string;
  deleteLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  deleteTitle: string;
  deleteDescription: string;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (postId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      toast.success('Post deleted successfully');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const deletingPost = posts.find((p) => p.id === deletingId);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>{post.title}</TableCell>
              <TableCell>{post.authorName || '-'}</TableCell>
              <TableCell>
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-20 w-24 rounded-md object-cover"
                  />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{post.categories || '-'}</TableCell>
              <TableCell>
                {new Date(post.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        {editLabel}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {viewLabel}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeletingId(post.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteLabel}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>
              {deleteDescription.replace('{title}', deletingPost?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
