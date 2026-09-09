import React from 'react';
import { requestDownloadUrl } from './api';

// Enlace de descarga para objetos privados en GCS.
//
// Sustituye al <a href="/api/gcs-sign?..."> directo: ahora el endpoint exige
// sesion, asi que primero pedimos la URL firmada con el token y despues
// navegamos a ella. La URL firmada responde con Content-Disposition attachment,
// por lo que el navegador descarga sin abandonar la pagina.
export const DownloadLink: React.FC<{
  fileKey?: string;
  fileUrl?: string;
  fileName?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ fileKey, fileUrl, fileName, className, children }) => {
  const [isPreparing, setIsPreparing] = React.useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!fileKey) return;
    event.preventDefault();
    if (isPreparing) return;

    setIsPreparing(true);
    try {
      window.location.href = await requestDownloadUrl(fileKey, fileName);
    } catch (error) {
      window.alert('No se pudo generar el enlace de descarga. Intenta nuevamente.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <a
      href={fileKey ? '#' : fileUrl}
      onClick={handleClick}
      target={fileKey ? undefined : '_blank'}
      rel={fileKey ? undefined : 'noopener noreferrer'}
      className={className}
    >
      {isPreparing ? 'Preparando...' : children}
    </a>
  );
};
