import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { Mensagem, MensagemPayload, UsuarioContato } from '../models/mensagem.model';
import { obterApiUrl } from '../config/api-config';

const TEMPO_LIMITE_REQUISICAO_MS = 10000;

@Injectable({
  providedIn: 'root'
})
export class MensagemService {
  private readonly apiUrl = obterApiUrl();

  public readonly naoLidas = signal(0);

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioContato[]> {
    return this.http.get<UsuarioContato[]>(`${this.apiUrl}/usuarios`).pipe(
      timeout(TEMPO_LIMITE_REQUISICAO_MS)
    );
  }

  buscarMensagens(idUsuario: number): Observable<Mensagem[]> {
    return this.http.get<Mensagem[]>(`${this.apiUrl}/mensagens/${idUsuario}`).pipe(
      timeout(TEMPO_LIMITE_REQUISICAO_MS)
    );
  }

  enviarMensagem(dados: MensagemPayload): Observable<Mensagem> {
    return this.http.post<Mensagem>(`${this.apiUrl}/mensagens`, dados).pipe(
      timeout(TEMPO_LIMITE_REQUISICAO_MS)
    );
  }

  marcarConversaComoLida(idOutro: number): Observable<{ ok: boolean; atualizadas: number }> {
    return this.http.put<{ ok: boolean; atualizadas: number }>(`${this.apiUrl}/mensagens/lidas`, {
      id_outro: idOutro
    }).pipe(
      timeout(TEMPO_LIMITE_REQUISICAO_MS)
    );
  }

  recalcularNaoLidas(mensagens: Mensagem[], idUsuario: number): void {
    const total = mensagens.filter(
      mensagem => mensagem.id_destinatario === idUsuario && !mensagem.lida
    ).length;
    this.naoLidas.set(total);
  }
}
