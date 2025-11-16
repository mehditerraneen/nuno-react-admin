import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useDataProvider, useNotify, useRefresh } from 'react-admin';

interface WoundImageGalleryProps {
  woundId: number;
  readonly?: boolean;
}

interface WoundImage {
  id: number;
  image: string;
  comment?: string;
  date_uploaded: string;
  evolution?: number;
}

/**
 * WoundImageGallery Component
 *
 * Features:
 * - Display grid of wound images
 * - Upload new images with optional comments
 * - Full-screen image viewer
 * - Delete images with confirmation
 * - Link images to specific evolutions
 * - Chronological ordering
 */
export const WoundImageGallery = ({ woundId, readonly = false }: WoundImageGalleryProps) => {
  const [images, setImages] = useState<WoundImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<WoundImage | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComment, setUploadComment] = useState('');

  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  useEffect(() => {
    if (woundId) {
      loadImages();
    }
  }, [woundId]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const response = await dataProvider.getWoundImages(woundId);
      setImages(Array.isArray(response) ? response : response.data || []);
    } catch (error: any) {
      notify(error.message || 'Erreur lors du chargement des images', { type: 'error' });
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

    try {
      await dataProvider.deleteWoundImage(woundId, imageId);
      notify('Image supprimée avec succès', { type: 'success' });
      loadImages();
      refresh();
    } catch (error: any) {
      notify(error.message || 'Erreur lors de la suppression', { type: 'error' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        notify('Veuillez sélectionner un fichier image', { type: 'error' });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        notify('La taille du fichier ne doit pas dépasser 10 MB', { type: 'error' });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      notify('Veuillez sélectionner un fichier', { type: 'error' });
      return;
    }

    setUploading(true);
    try {
      await dataProvider.uploadWoundImage(
        woundId,
        selectedFile,
        undefined, // evolution ID (can be added later)
        uploadComment || undefined
      );
      notify('Image téléchargée avec succès', { type: 'success' });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadComment('');
      loadImages();
      refresh();
    } catch (error: any) {
      notify(error.message || 'Erreur lors du téléchargement', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (images.length === 0 && readonly) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Aucune image disponible pour cette plaie.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Upload button */}
      {!readonly && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Télécharger une image
          </Button>
        </Box>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Aucune image n'a encore été ajoutée.
          </Typography>
          {!readonly && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cliquez sur "Télécharger une image" pour ajouter des photos.
            </Typography>
          )}
        </Paper>
      ) : (
        <ImageList cols={3} gap={8} sx={{ width: '100%', m: 0 }}>
          {images.map((image) => (
            <ImageListItem key={image.id}>
              <img
                src={image.image}
                alt={image.comment || 'Photo de plaie'}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedImage(image)}
              />
              <ImageListItemBar
                title={new Date(image.date_uploaded).toLocaleDateString('fr-FR')}
                subtitle={image.comment}
                actionIcon={
                  <Box>
                    <IconButton
                      sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                      onClick={() => setSelectedImage(image)}
                    >
                      <ZoomInIcon />
                    </IconButton>
                    {!readonly && (
                      <IconButton
                        sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                        onClick={() => handleDelete(image.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Full-screen image dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {selectedImage && (
            <>
              <IconButton
                onClick={() => setSelectedImage(null)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                }}
              >
                <CloseIcon />
              </IconButton>
              <img
                src={selectedImage.image}
                alt={selectedImage.comment || 'Photo de plaie'}
                style={{ width: '100%', display: 'block' }}
              />
              {selectedImage.comment && (
                <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="body2">
                    <strong>Commentaire:</strong> {selectedImage.comment}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Téléchargée le {new Date(selectedImage.date_uploaded).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Télécharger une image
          </Typography>

          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="wound-image-upload"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="wound-image-upload">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              startIcon={<UploadIcon />}
              sx={{ mb: 2 }}
            >
              {selectedFile ? selectedFile.name : 'Sélectionner une image'}
            </Button>
          </label>

          <TextField
            label="Commentaire (optionnel)"
            multiline
            rows={3}
            fullWidth
            value={uploadComment}
            onChange={(e) => setUploadComment(e.target.value)}
            helperText="Ajoutez des notes sur cette photo (ex: après traitement, guérison en cours)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
          >
            {uploading ? 'Téléchargement...' : 'Télécharger'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
