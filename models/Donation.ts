export type DonationStatus =
  | "disponivel"
  | "reservada"
  | "retirada"
  | "cancelada";

export type Donation = {
  tipoAlimento: string;
  quantidade: string;
  descricao: string;
  validade: string;
  localizacao: string;
  latitude?: number | null;
  longitude?: number | null;
  disponibilidade: string;
  perecivel: boolean;
  observacoes?: string;
  status: DonationStatus;
  donorId: string | null;
  createdAt: unknown;
};