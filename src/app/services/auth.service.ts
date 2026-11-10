import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, of, tap, timeout } from 'rxjs';
import { LoginPayload, CadastroPayload, AtualizarPerfilPayload, Usuario } from '../models/usuario.model';
import { obterApiUrl } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = obterApiUrl();

  private readonly usuarioAtualSignal = signal<Usuario | null>(null);

  public readonly estaLogado = computed(() => this.usuarioAtualSignal() !== null);
  public readonly usuarioLogado = computed(() => this.usuarioAtualSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(dados: LoginPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/auth/login`, dados).pipe(
      tap(usuario => this.usuarioAtualSignal.set(usuario))
    );
  }

  cadastrar(dados: CadastroPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/auth/cadastrar`, dados).pipe(
      tap(usuario => this.usuarioAtualSignal.set(usuario))
    );
  }

  atualizarPerfil(idUsuario: number, dados: AtualizarPerfilPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${idUsuario}`, dados).pipe(
      tap(usuario => this.usuarioAtualSignal.set(usuario))
    );
  }

  logout(): void {
    this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      finalize(() => {
        this.usuarioAtualSignal.set(null);
        this.router.navigate(['/login']);
      })
    ).subscribe({
      error: () => undefined
    });
  }

  restaurarSessao(): Promise<void> {
    return firstValueFrom(
      this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
        timeout(5000),
        catchError(() => of(null))
      )
    ).then(usuario => this.usuarioAtualSignal.set(usuario));
  }

  obterUsuarioLogado(): Usuario | null {
    return this.usuarioAtualSignal();
  }

  obterIdUsuario(): number | null {
    return this.usuarioAtualSignal()?.id_usuario ?? null;
  }
}
