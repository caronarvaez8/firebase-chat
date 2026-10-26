import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ChatService } from '../../services/chat';
import { Usuario } from '../../models/usuario';
import { MensajeChat } from '../../models/chat';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  usuario: User | null = null;                    
  mensajes: MensajeChat[] = [];                   
  mensajeTexto = '';                     
  enviandoMensaje = false;               
  asistenteEscribiendo = false;          
  cargandoHistorial = false;             
  mensajeError = '';                     
  
  private suscripciones: Subscription[] = [];
  

  private debeHacerScroll = false;

  async ngOnInit(): Promise<void> {
    try {
      await this.verificarAutenticacion();
      await this.inicializarChat();
      this.configurarSuscripciones();
    } catch (error) {
      console.error('Error initializing the chat:', error);
      this.mensajeError = 'Error loading the chat. Try refreshing the page.';
    }
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach(sub => sub.unsubscribe());
  }

 
  ngAfterViewChecked(): void {
    if (this.debeHacerScroll) {
      this.scrollHaciaAbajo();
      this.debeHacerScroll = false;
    }
  }

  private async verificarAutenticacion(): Promise<void> {
    this.usuario = this.authService.obtenerUsuarioActual();
  
    
    if (!this.usuario) {
      await this.router.navigate(['/auth']);
      throw new Error('User not authenticated');
    }
  }

  private async inicializarChat(): Promise<void> {
    if (!this.usuario) return;
    
    this.cargandoHistorial = true;
    
    try {
      
      await this.chatService.inicializarChat(this.usuario.uid);
      
    } catch (error) {
      console.error('Error initializing chat in component:', error);
      throw error;
      
    } finally {
      this.cargandoHistorial = false;
    }
  }

  private configurarSuscripciones(): void {
    
    const subMensajes = this.chatService.mensajes$.subscribe(mensajes => {
      this.mensajes = mensajes;
      this.debeHacerScroll = true;
    });
    
    const subAsistente = this.chatService.asistenteRespondiendo$.subscribe(respondiendo => {
      this.asistenteEscribiendo = respondiendo;
      if (respondiendo) {
        this.debeHacerScroll = true;
      }
    });
    
    this.suscripciones.push(subMensajes, subAsistente);
  }


  async enviarMensaje(): Promise<void> {
    if (!this.mensajeTexto.trim()) {
      return;
    }
    
    this.mensajeError = '';
    this.enviandoMensaje = true;
      
    const texto = this.mensajeTexto.trim();
    this.mensajeTexto = '';
    
    try {

      await this.chatService.enviarMensaje(texto);  
  
      this.enfocarInput();
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      this.mensajeError = error.message || 'Error sending the message:';
      
      this.mensajeTexto = texto;
      
    } finally {
      this.enviandoMensaje = false;
    }
  }

  manejarTeclaPresionada(evento: KeyboardEvent): void {

    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviarMensaje();
    }
  }

  async cerrarSesion(): Promise<void> {
    try {

      this.chatService.limpiarChat();
      
      await this.authService.cerrarSesion();
      
      await this.router.navigate(['/auth']);
      
    } catch (error) {
      console.error('Error signing out:', error);
      this.mensajeError = 'Error signing out:';
    }
  }

  private scrollHaciaAbajo(): void {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (error) {

    }
  }


  private enfocarInput(): void {
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }


  formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

 
  formatearMensajeAsistente(contenido: string): string {
    return contenido
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  trackByMensaje(index: number, mensaje: MensajeChat): string {
    return mensaje.id || `${mensaje.tipo}-${mensaje.fechaEnvio.getTime()}`;
  }


  manejarErrorImagen(evento: any): void {
    evento.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMEg2VjIySDZIMThINlYyMEM2IDE2LjY4NjMgMTUuMzEzNyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }
}