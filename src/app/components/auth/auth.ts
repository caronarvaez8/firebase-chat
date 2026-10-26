import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth',
  imports: [CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {

  private authService = inject(AuthService);
  private router = inject(Router);
  autenticando = false;
  mensajeError = '';

  async iniciarSesionConGoogle(): Promise<void> {
    this.mensajeError = '';
    this.autenticando = true;
    
    try {
      const usuario = await this.authService.iniciarSesionConGoogle();
     
      if (usuario) {
        await this.router.navigate(['/chat']);
        
      } else {
        this.mensajeError = 'Could not retrieve user information';
        console.error('Error during authentication:');
      }
      
    } catch (error: any) {
      console.error('Error during authentication:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        this.mensajeError = 'You closed the authentication window. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        this.mensajeError = 'Your browser blocked the authentication popup. Allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        this.mensajeError = 'Connection error. Check your internet connection and try again.';
      } else {
        this.mensajeError = 'Error signing in. Please try again.';
      }
      
    } finally {
      this.autenticando = false;
    }
  }

  ngOnInit(): void {
    this.authService.estaAutenticado$.subscribe(autenticado => {
      if (autenticado) {
        this.router.navigate(['/chat']);
      }
    });
  }
}