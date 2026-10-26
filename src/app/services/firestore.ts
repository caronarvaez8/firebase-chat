
import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext
} from '@angular/core';

import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Timestamp
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';
import { ConversacionChat, MensajeChat } from '../models/chat';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  async guardarMensaje(mensaje: MensajeChat): Promise<void> {
    try {
      if (!mensaje.usuarioId) {
        throw new Error('userId is required');
      }

      if (!mensaje.contenido) {
        throw new Error('content is required');
      }

      if (!mensaje.tipo) {
        throw new Error('type is required');
      }

      const coleccionMensajes = collection(
        this.firestore,
        'mensajes'
      );

      const mensajeParaGuardar = {
        usuarioId: mensaje.usuarioId,
        contenido: mensaje.contenido,
        tipo: mensaje.tipo,
        estado: mensaje.estado || 'enviado',
        fechaEnvio: Timestamp.fromDate(mensaje.fechaEnvio)
      };

      await addDoc(coleccionMensajes, mensajeParaGuardar);

    } catch (error) {
      console.error(
        'Error saving message to Firestore:',
        error
      );

      throw error;
    }
  }

  obtenerMensajesUsuario(
    usuarioId: string
  ): Observable<MensajeChat[]> {

    return new Observable<MensajeChat[]>(observer => {

      if (!usuarioId) {
        observer.error(
          new Error('userId is required to retrieve messages')
        );
        return;
      }

      const consulta = query(
        collection(this.firestore, 'mensajes'),
        where('usuarioId', '==', usuarioId)
      );

      const unsubscribe = runInInjectionContext(
        this.injector,
        () => onSnapshot(
          consulta,

          (snapshot: QuerySnapshot<DocumentData>) => {

            const mensajes: MensajeChat[] = snapshot.docs.map(doc => {
              const data = doc.data();
              const fecha = data['fechaEnvio'];

              let fechaEnvio: Date;

              if (fecha instanceof Timestamp) {
                fechaEnvio = fecha.toDate();
              } else if (fecha instanceof Date) {
                fechaEnvio = fecha;
              } else {
                fechaEnvio = new Date(fecha);

                if (Number.isNaN(fechaEnvio.getTime())) {
                  fechaEnvio = new Date();
                }
              }

              return {
                id: doc.id,
                usuarioId: data['usuarioId'],
                contenido: data['contenido'],
                tipo: data['tipo'],
                estado: data['estado'],
                fechaEnvio
              } as MensajeChat;
            });

            mensajes.sort(
              (a, b) =>
                a.fechaEnvio.getTime() - b.fechaEnvio.getTime()
            );

            observer.next(mensajes);
          },

          (error) => {
            console.error(
              'Error listening to Firestore messages:',
              error
            );

            observer.error(error);
          }
        )
      );
      return () => {
        unsubscribe();
      };
    });
  }

  async guardarConversacion(
    conversacion: ConversacionChat
  ): Promise<void> {

    try {
      const coleccionConversaciones = collection(
        this.firestore,
        'conversaciones'
      );

      const conversacionParaGuardar = {
        ...conversacion,

        fechaCreacion: Timestamp.fromDate(
          conversacion.fechaCreacion
        ),

        ultimaActividad: Timestamp.fromDate(
          conversacion.ultimaActividad
        ),

        mensajes: conversacion.mensajes.map(mensaje => ({
          ...mensaje,
          fechaEnvio: Timestamp.fromDate(mensaje.fechaEnvio)
        }))
      };

      await addDoc(
        coleccionConversaciones,
        conversacionParaGuardar
      );

    } catch (error) {
      console.error(
        'Error saving conversation:',
        error
      );

      throw error;
    }
  }
}
