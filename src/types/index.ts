/**
 * Tipos compartilhados do serviço de catálogo
 */

export interface Product {
  id: string;
  titulo: string;
  autor: string;
  preco: number;
  capa_url: string;
  categoria: string;
  preview_url?: string;
  criado_em: Date;
  atualizado_em: Date;
}

export interface ListProductsQuery {
  page?: number;
  limit?: number;
  categoria?: string;
  search?: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  timestamp?: string;
}
