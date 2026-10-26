import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface PeticionGemini {
  contents: ContenteGemini[];         
  generationConfig?: {                
    maxOutputTokens?: number;        
    temperature?: number;            
  };
  safetySettings?: SafetySetting[];   
}

interface ContenteGemini {
  role: 'user' | 'model';            
  parts: PartGemini[];              
}

interface PartGemini {
  text: string;                      
}

interface SafetySetting {
  category: string;                  
  threshold: string;                 
}

interface RespuestaGemini {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {

  private http = inject(HttpClient);

  private readonly apiUrl = environment.gemini.apiUrl;
  private readonly apiKey = environment.gemini.apiKey;

  enviarMensaje(mensaje: string, historialPrevio: ContenteGemini[] = []): Observable<string> {
    
    if (!this.apiKey) {
      console.error('Gemini API key is not configured');
      return throwError(() => new Error('Gemini API key is not configured'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const mensajeSistema: ContenteGemini = {
      role: 'user',
      parts: [{
        text: `Understood. I'm your virtual assistant specializing in technology and programming. I'll help you clearly and professionally in English. How can I help you?`
      }]
    };

    const respuestaSistema: ContenteGemini = {
      role: 'model',
      parts: [{
        text: `Understood. I'm your virtual assistant specializing in technology and programming. I'll help you clearly and professionally in English. How can I help you?`
      }]
    };

    const contenidos: ContenteGemini[] = [
      mensajeSistema,
      respuestaSistema,
      ...historialPrevio,
      {
        role: 'user',
        parts: [{ text: mensaje }]
      }
    ];

    const configuracionesSeguridad: SafetySetting[] = [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ];

    const cuerposPeticion: PeticionGemini = {
      contents: contenidos,
      generationConfig: {
        maxOutputTokens: 800,        
        temperature: 0.7            
      },
      safetySettings: configuracionesSeguridad
    };

    const urlCompleta = `${this.apiUrl}?key=${this.apiKey}`;

    return this.http.post<RespuestaGemini>(urlCompleta, cuerposPeticion, { headers })
      .pipe(
        map(respuesta => {
          if (respuesta.candidates && respuesta.candidates.length > 0) {
            const candidate = respuesta.candidates[0];
            
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              let contenidoRespuesta = candidate.content.parts[0].text;
              if (candidate.finishReason === 'MAX_TOKENS') {
                contenidoRespuesta += '\n\n[Note: Response truncated due to token limit. You can ask me to continue.]';
              }

              return contenidoRespuesta;
            } else {
              throw new Error('Gemini response does not contain valid content');
            }
          } else {
            throw new Error('Gemini response is not in the expected format');
          }
        }),

        catchError(error => {
          console.error('Error communicating with Gemini:', error);

          // Personalizamos el mensaje de error según el tipo
          let mensajeError = 'Error connecting to Gemini';

          if (error.status === 400) {
            mensajeError = 'Invalid request to Gemini. Check the configuration..';
          } else if (error.status === 403) {
            mensajeError = 'Invalid Gemini API key or insufficient permissions';
          } else if (error.status === 429) {
            mensajeError = 'You have exceeded the request limit. Please try again later.';
          } else if (error.status === 500) {
            mensajeError = 'Gemini server error. Please try again later.';
          } else if (error.error?.error?.message) {
            mensajeError = error.error.error.message;
          }

          return throwError(() => new Error(mensajeError));
        })
      );
  }


  convertirHistorialAGemini(mensajes: any[]): ContenteGemini[] {
    const historialConvertido: ContenteGemini[] = mensajes.map(msg => ({
      role: (msg.tipo === 'usuario' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.contenido }]
    }));

    if (historialConvertido.length > 8) {
      const ultimosMensajes = historialConvertido.slice(-6);
      if (ultimosMensajes.length > 0 && ultimosMensajes[0].role === 'model') {
        return ultimosMensajes.slice(1);
      }

      return ultimosMensajes;
    }

    return historialConvertido;
  }

  verificarConfiguracion(): boolean {
    const configuracionValida = !!(this.apiKey && this.apiUrl);

    return configuracionValida;
  }
}