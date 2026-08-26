import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginPayload, CadastroPayload, Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api';

  private readonly usuarioAtualSignal = signal<Usuario | null>(this.carregarSessao());

  public readonly estaLogado = computed(() => this.usuarioAtualSignal() !== null);
  public readonly usuarioLogado = computed(() => this.usuarioAtualSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(dados: LoginPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.API_URL}/auth/login`, dados).pipe(
      tap(usuario => this.salvarSessao(usuario))
    );
  }

  cadastrar(dados: CadastroPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.API_URL}/auth/cadastrar`, dados).pipe(
      tap(usuario => this.salvarSessao(usuario))
    );
  }

  logout(): void {
    this.usuarioAtualSignal.set(null);
    localStorage.removeItem('usuario_doalink');
    this.router.navigate(['/login']);
  }

  obterUsuarioLogado(): Usuario | null {
    return this.usuarioAtualSignal();
  }

  obterIdUsuario(): number | null {
    return this.usuarioAtualSignal()?.id_usuario ?? null;
  }

  private salvarSessao(usuario: Usuario): void {
    this.usuarioAtualSignal.set(usuario);
    localStorage.setItem('usuario_doalink', JSON.stringify(usuario));
  }

  private carregarSessao(): Usuario | null {
    const dadosSalvos = localStorage.getItem('usuario_doalink');
    if (!dadosSalvos) {
      return null;
    }
    return JSON.parse(dadosSalvos) as Usuario;
  }
}
