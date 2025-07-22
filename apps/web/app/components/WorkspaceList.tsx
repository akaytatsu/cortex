import type { Workspace } from "shared-types";
import { useState } from "react";
import { Form, Link } from "@remix-run/react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { 
  Folder, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Trash2, 
  Plus,
  Code,
  AlertTriangle
} from "lucide-react";

interface WorkspaceListProps {
  workspaces: Workspace[];
}

// Helper function to generate workspace preview
function generateWorkspacePreview(workspaceName: string): string {
  // Mock preview based on workspace name or could be enhanced with actual file previews
  const previews = [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='12' fill='%236b7280'%3ECode%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ddd6fe'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='12' fill='%238b5cf6'%3EReact%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23dcfce7'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='12' fill='%2316a34a'%3ENode%3C/text%3E%3C/svg%3E",
  ];
  const hash = workspaceName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return previews[Math.abs(hash) % previews.length];
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "Data não disponível";
  return new Date(dateString).toLocaleDateString('pt-BR');
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (workspaceName: string) => {
    setWorkspaceToDelete(workspaceName);
  };

  const handleConfirmDelete = () => {
    setWorkspaceToDelete(null);
  };

  const handleCancelDelete = () => {
    setWorkspaceToDelete(null);
  };

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <Card variant="outlined" className="max-w-md mx-auto">
          <Card.Content className="p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum workspace encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crie seu primeiro workspace para começar a desenvolver
            </p>
            <Link to="/workspaces/new">
              <Button className="inline-flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Criar Workspace
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map(workspace => (
          <Card
            key={workspace.name}
            variant="elevated"
            className="group hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            {/* Preview Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-primary-100 to-secondary-100 relative overflow-hidden">
              <img
                src={generateWorkspacePreview(workspace.name)}
                alt={`${workspace.name} preview`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute top-3 right-3">
                <div className="flex items-center space-x-1 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                  <Code className="w-3 h-3" />
                  <span>IDE</span>
                </div>
              </div>
            </div>

            <Card.Content className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {workspace.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {workspace.path}
                  </p>
                </div>
              </div>

              {/* Workspace Stats */}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-4">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{formatDate(workspace.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Ativo</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Link
                  to={`/workspaces/${encodeURIComponent(workspace.name)}`}
                  className="flex-1"
                >
                  <Button 
                    variant="default" 
                    className="w-full text-sm"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(workspace.name)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Add New Workspace Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/workspaces/new">
          <Card 
            variant="outlined" 
            className="group hover:shadow-lg transition-all duration-200 border-dashed border-2 hover:border-primary-300 cursor-pointer"
          >
            <Card.Content className="p-8 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                <Plus className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-medium text-foreground mb-2">
                Adicionar Workspace
              </h3>
              <p className="text-sm text-muted-foreground">
                Crie um novo ambiente de desenvolvimento
              </p>
            </Card.Content>
          </Card>
        </Link>
      </div>

      {/* Enhanced Confirmation Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <Card variant="elevated" className="w-full max-w-md">
            <Card.Content className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Confirmar remoção
                </h3>
                
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Tem certeza que deseja remover o workspace{" "}
                    <span className="font-medium text-foreground">
                      &quot;{workspaceToDelete}&quot;
                    </span>?
                  </p>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Esta ação apenas remove o workspace da lista. Os arquivos não serão deletados.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelDelete}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Form
                    method="post"
                    action={`/workspaces/${encodeURIComponent(workspaceToDelete)}/delete`}
                    onSubmit={handleConfirmDelete}
                    className="flex-1"
                  >
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </Form>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}
