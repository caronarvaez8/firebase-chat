
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { MensajeChat } from '../models/chat';
import { AuthService } from './auth';
import { FirestoreService } from './firestore';
import { GeminiService } from './gemini';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  
  private authService = inject(AuthService);

  private firestoreService = inject(FirestoreService);
  private geminiService = inject(GeminiService);
  private mensajesSubject = new BehaviorSubject<MensajeChat[]>([]);
  public mensajes$ = this.mensajesSubject.asObservable();
  
  private cargandoHistorial = false;
  private asistenteRespondiendo = new BehaviorSubject<boolean>(false);
  public asistenteRespondiendo$ = this.asistenteRespondiendo.asObservable();

  async inicializarChat(usuarioId: string): Promise<void> {
    if (this.cargandoHistorial) {
      return;
    }
    
    this.cargandoHistorial = true;
    
    try {
      this.firestoreService.obtenerMensajesUsuario(usuarioId).subscribe({
        next: (mensajes) => {
          this.mensajesSubject.next(mensajes);
          this.cargandoHistorial = false;
        },
        error: (error) => {
          console.error('Error loading history:', error);
          this.cargandoHistorial = false;
          this.mensajesSubject.next([]);
        }
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
      this.cargandoHistorial = false;
      this.mensajesSubject.next([]);
    }
  }

  async enviarMensaje(contenidoMensaje: string): Promise<void> {
    const usuarioActual = this.authService.obtenerUsuarioActual();
    
    if (!usuarioActual) {
      console.error('No authenticated user');
      throw new Error('User not authenticated');
    }
    
    if (!contenidoMensaje.trim()) {
      return;
    }
    
    const mensajeUsuario: MensajeChat = {
      usuarioId: usuarioActual.uid,
      contenido: contenidoMensaje.trim(),
      fechaEnvio: new Date(),
      tipo: 'usuario',
      estado: 'enviando'
    };
    
    try {
      const mensajesDelUsuario = this.mensajesSubject.value;
      
      const nuevosMatches = [...mensajesDelUsuario, mensajeUsuario];
      this.mensajesSubject.next(nuevosMatches);
      try {
        await this.firestoreService.guardarMensaje(mensajeUsuario);
      } catch (firestoreError) {
      }
      
      this.asistenteRespondiendo.next(true);
      
      const mensajesActuales = this.mensajesSubject.value;

      const historialParaGemini = this.geminiService.convertirHistorialAGemini(
        mensajesActuales.slice(-6)
      );
      
      const respuestaAsistente = await firstValueFrom(
        this.geminiService.enviarMensaje(contenidoMensaje, historialParaGemini)
      );

      const mensajeAsistente: MensajeChat = {
        usuarioId: usuarioActual.uid,
        contenido: respuestaAsistente,
        fechaEnvio: new Date(),
        tipo: 'asistente',
        estado: 'enviado'
      };
      
      const mensajesActualizados = this.mensajesSubject.value;
      
      const nuevosMatches2 = [...mensajesActualizados, mensajeAsistente];
      this.mensajesSubject.next(nuevosMatches2);
      
      try {
        await this.firestoreService.guardarMensaje(mensajeAsistente);
      } catch (firestoreError) {
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      const mensajeError: MensajeChat = {
        usuarioId: usuarioActual.uid,
        contenido: 'Sorry, there was a problem processing your message. Please try again.',
        fechaEnvio: new Date(),
        tipo: 'asistente',
        estado: 'error'
      };
      
      try {
        await this.firestoreService.guardarMensaje(mensajeError);
      } catch (saveErrorError) {
        console.error('Error saving error message:', saveErrorError);
        const mensajesActuales = this.mensajesSubject.value;
        this.mensajesSubject.next([...mensajesActuales, mensajeError]);
      }
      
      throw error;
      
    } finally {
      this.asistenteRespondiendo.next(false);
    }
  }

  obtenerMensajes(): MensajeChat[] {
    return this.mensajesSubject.value;
  }

  limpiarChat(): void {
    this.mensajesSubject.next([]);
  }

  chatListo(): boolean {
    const usuarioAutenticado = !!this.authService.obtenerUsuarioActual();
    const geminiConfigurado = this.geminiService.verificarConfiguracion();
    return usuarioAutenticado && geminiConfigurado;
  }

}