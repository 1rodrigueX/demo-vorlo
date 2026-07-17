import "server-only";
import { MercadoPagoConfig } from "mercadopago";

let config: MercadoPagoConfig | null = null;

export function getMercadoPagoConfig(): MercadoPagoConfig {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada");
  }
  if (!config) {
    config = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  }
  return config;
}
