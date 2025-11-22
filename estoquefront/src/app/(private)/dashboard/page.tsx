'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, Archive } from "lucide-react";

const GATEWAY_URL = 'http://localhost:5188';
const VENDAS_API_URL = `${GATEWAY_URL}/api/vendas/estatisticas`;
const ESTOQUE_API_URL = `${GATEWAY_URL}/api/estoque/estatisticas`;

type Stats = {
  totalDeVendas: number;
  valorTotalArrecadado: number;
  totalProdutos: number;
  quantidadeTotalEmEstoque: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Você não está autenticado. Redirecionando para login...");
        router.push('/login');
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      const [vendasResponse, estoqueResponse] = await Promise.all([
        fetch(VENDAS_API_URL, { headers }),
        fetch(ESTOQUE_API_URL, { headers })
      ]);

      for (const response of [vendasResponse, estoqueResponse]) {
       
        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Sua sessão expirou. Por favor, faça login novamente.");
            
            localStorage.removeItem('authToken');
            router.push('/login');
            throw new Error("Falha na autorização.");

          }
          throw new Error(`Falha ao buscar dados do servidor ${response.statusText}`);
        }

      }

      const vendasData = await vendasResponse.json();
      const estoqueData = await estoqueResponse.json();

      setStats({ ...vendasData, ...estoqueData });

    } catch (error: any) {
      if (error.message !== "Falha na autorização.") {
        toast.error("Não foi possível carregar as estatísticas do dashboard.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard de Análise</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.valorTotalArrecadado) : 'R$ 0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `+${stats.totalDeVendas}` : '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Produto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.totalProdutos : '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.quantidadeTotalEmEstoque : '0'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}