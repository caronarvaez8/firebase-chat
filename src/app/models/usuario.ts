export interface Usuario {
uid: string;
email: string;
nombre?: string;
fotoUrl?: string;
fechaCreacion: Date;
ultimaConexion: Date;
}