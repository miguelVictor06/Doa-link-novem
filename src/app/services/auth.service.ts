import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, tap, timeout } from 'rxjs';
import { LoginPayload, CadastroPayload, AtualizarPerfilPayload, Usuario } from '../models/usuario.model';
import { obterApiUrl } from '../config/api-config';

const TEMPO_LIMITE_RESTAURACAO_MS = 8000;
const TENTATIVAS_REVALIDACAO = 3;
const ESPERA_BASE_REVALIDACAO_MS = 2000;
const CHAVE_CACHE_USUARIO = 'usuario_doalink';

export type EstadoAutenticacao = 'desconhecido' | 'autenticado' | 'anonimo';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = obterApiUrl();

  private readonly usuarioAtualSignal = signal<Usuario | null>(this.lerUsuarioDoCache());

  private readonly estadoAutenticacaoSignal = signal<EstadoAutenticacao>(
    this.usuarioAtualSignal() ? 'autenticado' : 'desconhecido'
  );

  private readonly erroRestauracaoSignal = signal<string | null>(null);

  private restauracaoEmAndamento: Promise<void> | null = null;

  private versaoSessao = 0;

  public readonly estaLogado = computed(() => this.usuarioAtualSignal() !== null);
  public readonly usuarioLogado = computed(() => this.usuarioAtualSignal());
  public readonly estadoAutenticacao = computed(() => this.estadoAutenticacaoSignal());
  public readonly erroRestauracao = computed(() => this.erroRestauracaoSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(dados: LoginPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/auth/login`, dados).pipe(
      tap(usuario => this.definirUsuario(usuario))
    );
  }

  cadastrar(dados: CadastroPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/auth/cadastrar`, dados).pipe(
      tap(usuario => this.definirUsuario(usuario))
    );
  }

  atualizarPerfil(idUsuario: number, dados: AtualizarPerfilPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${idUsuario}`, dados).pipe(
      tap(usuario => this.definirUsuario(usuario))
    );
  }

  logout(): void {
    this.versaoSessao++;

    this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      finalize(() => {
        this.limparSessaoLocal();
        this.estadoAutenticacaoSignal.set('anonimo');
        this.router.navigate(['/login']);
      })
    ).subscribe({
      error: () => undefined
    });
  }

  restaurarSessao(): Promise<void> {
    if (this.restauracaoEmAndamento) {
      return this.restauracaoEmAndamento;
    }

    this.restauracaoEmAndamento = this.executarRestauracao().finally(() => {
      this.restauracaoEmAndamento = null;
    });

    return this.restauracaoEmAndamento;
  }

  expirarSessao(returnUrl?: string): void {
    const jaEstavaAnonimo = this.estadoAutenticacaoSignal() === 'anonimo' && !this.usuarioAtualSignal();

    this.limparSessaoLocal();
    this.estadoAutenticacaoSignal.set('anonimo');

    if (jaEstavaAnonimo || this.router.url.startsWith('/login')) {
      return;
    }

    const url = returnUrl && returnUrl !== '/' ? returnUrl : undefined;
    this.router.navigate(['/login'], { queryParams: url ? { returnUrl: url } : {} });
  }

  obterUsuarioLogado(): Usuario | null {
    return this.usuarioAtualSignal();
  }

  obterIdUsuario(): number | null {
    return this.usuarioAtualSignal()?.id_usuario ?? null;
  }

  private async executarRestauracao(): Promise<void> {
    const versao = this.versaoSessao;
    const usuarioDoCache = this.usuarioAtualSignal();

    try {
      const usuario = await firstValueFrom(
        this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
          timeout(TEMPO_LIMITE_RESTAURACAO_MS)
        )
      );

      if (versao !== this.versaoSessao) {
        return;
      }

      this.definirUsuario(usuario);
    } catch (erro) {
      if (versao !== this.versaoSessao) {
        return;
      }

      if (this.ehNaoAutenticado(erro)) {
        this.limparSessaoLocal();
        this.estadoAutenticacaoSignal.set('anonimo');
        return;
      }

      this.erroRestauracaoSignal.set(
        'Não foi possível confirmar sua sessão com o servidor. Verifique sua conexão e tente novamente.'
      );

      if (!usuarioDoCache) {
        this.estadoAutenticacaoSignal.set('desconhecido');
      }

      this.revalidarEmSegundoPlano(versao);
    }
  }

  private revalidarEmSegundoPlano(versao: number): void {
    void this.revalidar(versao);
  }

  private async revalidar(versao: number): Promise<void> {
    for (let tentativa = 1; tentativa <= TENTATIVAS_REVALIDACAO; tentativa++) {
      await this.esperar(ESPERA_BASE_REVALIDACAO_MS * tentativa);

      if (versao !== this.versaoSessao) {
        return;
      }

      try {
        const usuario = await firstValueFrom(
          this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
            timeout(TEMPO_LIMITE_RESTAURACAO_MS)
          )
        );

        if (versao !== this.versaoSessao) {
          return;
        }

        this.definirUsuario(usuario);
        return;
      } catch (erro) {
        if (versao !== this.versaoSessao) {
          return;
        }

        if (this.ehNaoAutenticado(erro)) {
          this.expirarSessao(this.router.url);
          return;
        }
      }
    }
  }

  private definirUsuario(usuario: Usuario): void {
    this.versaoSessao++;
    this.usuarioAtualSignal.set(usuario);
    this.estadoAutenticacaoSignal.set('autenticado');
    this.erroRestauracaoSignal.set(null);
    this.gravarUsuarioNoCache(usuario);
  }

  private limparSessaoLocal(): void {
    this.versaoSessao++;
    this.usuarioAtualSignal.set(null);
    this.erroRestauracaoSignal.set(null);
    this.removerUsuarioDoCache();
  }

  private ehNaoAutenticado(erro: unknown): boolean {
    return typeof erro === 'object' && erro !== null && 'status' in erro &&
      (erro as { status?: number }).status === 401;
  }

  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private lerUsuarioDoCache(): Usuario | null {
    try {
      const bruto = localStorage.getItem(CHAVE_CACHE_USUARIO);

      if (!bruto) {
        return null;
      }

      const usuario = JSON.parse(bruto) as Usuario;

      if (!usuario || typeof usuario.id_usuario !== 'number') {
        localStorage.removeItem(CHAVE_CACHE_USUARIO);
        return null;
      }

      return usuario;
    } catch {
      return null;
    }
  }

  private gravarUsuarioNoCache(usuario: Usuario): void {
    try {
      localStorage.setItem(CHAVE_CACHE_USUARIO, JSON.stringify(usuario));
    } catch {
      // Armazenamento indisponível (modo privado); a sessão continua válida no cookie.
    }
  }

  private removerUsuarioDoCache(): void {
    try {
      localStorage.removeItem(CHAVE_CACHE_USUARIO);
    } catch {
      // Ignora indisponibilidade do armazenamento.
    }
  }
}
