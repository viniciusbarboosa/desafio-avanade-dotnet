'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Tipos de dados que este componente precisa para funcionar
type ItemPedidoDetalhado = {
  produtoId: number;
  quantidade: number;
  nomeProduto: string;
  precoUnitario: number;
};

type PedidoDetalhado = {
  id: number;
  dataPedido: string;
  valorTotal: number;
  itens: ItemPedidoDetalhado[];
};

interface VisualizarPedidoModalProps {
  pedido: PedidoDetalhado | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VisualizarPedidoModal({ pedido, isOpen, onClose }: VisualizarPedidoModalProps) {
  if (!pedido) return null; // Não renderiza nada se não houver pedido

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda #{pedido.id}</DialogTitle>
          <DialogDescription>
            Realizada em: {new Date(pedido.dataPedido).toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="mb-2 font-semibold">Itens do Pedido:</h3>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Preço Un.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.itens.map(item => (
                  <TableRow key={item.produtoId}>
                    <TableCell className="font-medium">{item.nomeProduto}</TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.precoUnitario)}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.precoUnitario * item.quantidade)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-right text-lg font-bold">
            Valor Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pedido.valorTotal)}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}