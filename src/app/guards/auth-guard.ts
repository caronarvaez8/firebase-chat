import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.estaAutenticado$.pipe(
      tap(estaAutenticado => {
        if (!estaAutenticado) {
          console.log('Access denied - User not authenticated');
          this.router.navigate(['/auth']);
        } else {
          console.log('Access granted - User authenticated');
        }
      }),
      map(estaAutenticado => estaAutenticado)
    );
  }
}