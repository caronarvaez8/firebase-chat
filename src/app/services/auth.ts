import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  user,
  User
} from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { Usuario } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  usuario$ = user(this.auth);

  estaAutenticado$ = this.usuario$.pipe(
    map(usuario => !!usuario)
  );

  async iniciarSesionConGoogle(): Promise<Usuario | null> {
    try {
      const proveedor = new GoogleAuthProvider();

      proveedor.addScope('email');
      proveedor.addScope('profile');

      const resultado = await signInWithPopup(this.auth, proveedor);

      const usuarioFirebase = resultado.user;

      if (usuarioFirebase) {
        const usuario: Usuario = {
          uid: usuarioFirebase.uid,
          email: usuarioFirebase.email || '',
          nombre: usuarioFirebase.displayName || 'User without a name',
          fotoUrl: usuarioFirebase.photoURL || undefined,
          fechaCreacion: new Date(),
          ultimaConexion: new Date()
        };

        return usuario;
      }

      return null;

    } catch (error) {
      console.error('Error during authentication:', error);
      throw error;
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await signOut(this.auth);

    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  obtenerUsuarioActual(): User | null {
    return this.auth.currentUser;
  }

  obtenerUidUsuario(): string | null {
    const usuario = this.obtenerUsuarioActual();
    return usuario ? usuario.uid : null;
  }
}