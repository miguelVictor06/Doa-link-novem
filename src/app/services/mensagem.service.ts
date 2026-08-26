import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mensagem, MensagemPayload, UsuarioContato } from '../models/mensagem.model';

@Injectable({
  providedIn: 'root'
})
export class MensagemService {
  private readonly API_URL = 'http://localhost:8080/api';

  public readonly naoLidas = signal(0);

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioContato[]> {
    return this.http.get<UsuarioContato[]>(`${this.API_URL}/usuarios`);
  }

  buscarMensagens(idUsuario: number): Observable<Mensagem[]> {
    return this.http.get<Mensagem[]>(`${this.API_URL}/mensagens/${idUsuario}`);
  }

  enviarMensagem(dados: MensagemPayload): Observable<Mensagem> {
    return this.http.post<Mensagem>(`${this.API_URL}/mensagens`, dados);
  }

  marcarConversaComoLida(idUsuario: number, idOutro: number): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.API_URL}/mensagens/lidas`, {
      id_usuario: idUsuario,
      id_outro: idOutro
    });
  }

  recalcularNaoLidas(mensagens: Mensagem[], idUsuario: number): void {
    const total = mensagens.filter(
      mensagem => mensagem.id_destinatario === idUsuario && !mensagem.lida
    ).length;
    this.naoLidas.set(total);
  }
}
