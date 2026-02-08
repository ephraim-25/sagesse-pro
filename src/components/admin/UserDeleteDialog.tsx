import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

interface UserDeleteDialogProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDeleteDialog = ({ userId, userName, open, onOpenChange }: UserDeleteDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc('admin_delete_user', {
        p_user_id: id,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Utilisateur supprimé avec succès', {
        description: `${userName} a été retiré de la plateforme.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression', {
        description: (error as Error).message,
      });
    },
  });

  const handleDelete = () => {
    if (userId) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Confirmer la suppression
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer <strong>{userName}</strong> de la plateforme ?
            </p>
            <p className="text-destructive font-medium">
              Cette action est irréversible. Toutes les données associées à cet utilisateur 
              (présences, tâches, performances) seront également supprimées.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
