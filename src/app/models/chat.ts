export interface MensajeChat {
  id?: string;
  usuarioId: string;
  contenido: string;
  fechaEnvio: Date;
  tipo: 'usuario' | 'asistente';
  estado?: 'enviando' | 'enviado' | 'error' | 'temporal';
}

export interface ConversacionChat {
  id?: string;
  usuarioId: string;
  mensajes: MensajeChat[];
  fechaCreacion: Date;
  ultimaActividad: Date;
  titulo?: string;
}