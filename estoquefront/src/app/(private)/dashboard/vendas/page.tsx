'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { ComboboxProdutos } from '@/components/ComboboxProdutos';
import { VisualizarPedidoModal } from './_components/VisualizarPedidoModal';
import { Label } from '@/components/ui/label';


const API_VENDAS_URL = 'http://localhost:5188/api/vendas';
const API_ESTOQUE_URL = 'http://localhost:5188/api/estoque';

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

type Produto = {
    id: number;
    nome: string;
    descricao: string;
    preco: number;
    quantidadeEmEstoque: number;
};

type ItemPedidoCarrinho = {
    produtoId: number;
    quantidade: number;
    nomeProduto: string;
    precoUnitario: number;
};

type Pedido = {
    id: number;
    dataPedido: string;
    valorTotal: number;
    itens: {
        produtoId: number;
        quantidade: number;
    }[];
};

export default function VendasPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [carrinho, setCarrinho] = useState<ItemPedidoCarrinho[]>([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingPedido, setViewingPedido] = useState<any | null>(null);

    const [dataEditavel, setDataEditavel] = useState('');

    const router = useRouter();
    const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Você não está autenticado. Redirecionando para login...");
            router.push('/login');
            return;
        }

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [pedidosResponse, produtosResponse] = await Promise.all([
                fetch(API_VENDAS_URL, { headers }),
                fetch(API_ESTOQUE_URL, { headers })
            ]);

        for (const response of [pedidosResponse, produtosResponse]) {
                if (!response.ok) {
                    if (response.status === 401) {
                        toast.error("Sua sessão expirou. Por favor, faça login novamente.");
                        localStorage.removeItem('authToken');                      router.push('/login'); 
                        throw new Error("Falha na autorização."); 
                    }
                    throw new Error("Falha ao buscar dados do servidor.");
                }
            }
            setPedidos(await pedidosResponse.json());
            setProdutosDisponiveis(await produtosResponse.json());

        } catch (error: any) {
            if (error.message !== "Falha na autorização.") {
                toast.error(error.message || "Não foi possível carregar os dados da página.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddProdutoAoCarrinho = (produto: Produto) => {
        setCarrinho(prev => {
            const itemExistente = prev.find(item => item.produtoId === produto.id);
            if (itemExistente) {
                return prev.map(item =>
                    item.produtoId === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
                );
            }
            return [...prev, {
                produtoId: produto.id,
                quantidade: 1,
                nomeProduto: produto.nome,
                precoUnitario: produto.preco
            }];
        });
    };

    const handleUpdateQuantidade = (produtoId: number, novaQuantidade: number) => {
        const qtd = Math.floor(novaQuantidade);
        if (qtd <= 0) {
            setCarrinho(prev => prev.filter(item => item.produtoId !== produtoId));
        } else {
            setCarrinho(prev => prev.map(item =>
                item.produtoId === produtoId ? { ...item, quantidade: qtd } : item
            ));
        }
    };

    const valorTotalCarrinho = useMemo(() => {
        return carrinho.reduce((total, item) => total + item.precoUnitario * item.quantidade, 0);
    }, [carrinho]);

    const handleAddNew = () => {
        setDataEditavel(new Date().toISOString().split('T')[0]);
        setEditingPedido(null);
        setCarrinho([]);
        setIsEditModalOpen(true);
    };

    const handleEdit = (pedido: Pedido) => {
        setEditingPedido(pedido);
        setDataEditavel(pedido.dataPedido.split('T')[0]);
        const carrinhoParaEditar = pedido.itens.map(item => {
            const produtoInfo = produtosDisponiveis.find(p => p.id === item.produtoId);
            return { ...item, nomeProduto: produtoInfo?.nome || 'Não encontrado', precoUnitario: produtoInfo?.preco || 0 };
        });
        setCarrinho(carrinhoParaEditar);
        setIsEditModalOpen(true);
    };

    const handleViewDetails = (pedido: Pedido) => {
        const pedidoDetalhado = {
            ...pedido,
            itens: pedido.itens.map(item => {
                const produtoInfo = produtosDisponiveis.find(p => p.id === item.produtoId);
                return { ...item, nomeProduto: produtoInfo?.nome || 'Não encontrado', precoUnitario: produtoInfo?.preco || 0 };
            })
        };
        setViewingPedido(pedidoDetalhado);
        setIsViewModalOpen(true);
    };

    const handleSubmit = async () => {
        if (carrinho.length === 0) {
            toast.error("Adicione pelo menos um item ao pedido.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            toast.error("Autenticação não encontrada. Faça login novamente.");
            return;
        }

        //DECODIGICA PRA PEGAR O ID O USUARIO PRA COLCOAR NA VENDA
        const decodedToken = parseJwt(token);
        const usuarioId = decodedToken?.Id; 
        if (!usuarioId) {
            toast.error("ID do usuário não encontrado no token.");
            return;
        }

        const isEditMode = !!editingPedido;

        const payload = {
            Id: isEditMode ? editingPedido.id : 0,
            UsuarioId: parseInt(usuarioId), 
            DataPedido: new Date(dataEditavel).toISOString(), 
            ValorTotal: valorTotalCarrinho, 
            Itens: carrinho.map(({ produtoId, quantidade, precoUnitario }) => ({
                ProdutoId: produtoId,
                Quantidade: quantidade,
                PrecoUnitario: precoUnitario
            }))
        };

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_VENDAS_URL}/${editingPedido.id}` : API_VENDAS_URL;

        const promise = fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        }).then(async res => {
            if (!res.ok) {
        
                const errorText = await res.text();

                throw new Error(errorText || "Falha na operação. Tente novamente.");

            }
            return res;
        });

        toast.promise(promise, {
            loading: 'Salvando venda...',
            success: () => {
                setIsEditModalOpen(false);
                fetchData();
                return 'Venda salva com sucesso!';
            },
            error: (err) => `Erro: ${err.message}`,
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Gerenciamento de Vendas</h1>
                <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Nova Venda</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Data</TableHead><TableHead>Itens</TableHead><TableHead>Valor Total</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Carregando...</TableCell></TableRow>
                            : pedidos.length > 0 ? pedidos.map(pedido => (
                                <TableRow key={pedido.id}>
                                    <TableCell>{pedido.id}</TableCell>
                                    <TableCell>{new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{pedido.itens.length}</TableCell>
                                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pedido.valorTotal)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleViewDetails(pedido)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(pedido)}>Editar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                                : <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma venda encontrada.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPedido ? `Editando Venda #${editingPedido.id}` : 'Criar Nova Venda'}</DialogTitle>
                        <DialogDescription>Adicione produtos ao pedido e defina as quantidades.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="data-pedido" className="text-right">
                            Data da Venda
                        </Label>
                        <Input
                            id="data-pedido"
                            type="date"
                            value={dataEditavel}
                            onChange={(e) => setDataEditavel(e.target.value)} 
                            className="col-span-3"
                        />
                    </div>
                    <div className="py-4 space-y-4">
                        <ComboboxProdutos produtos={produtosDisponiveis} onSelectProduto={handleAddProdutoAoCarrinho} />
                        <div className="max-h-64 overflow-y-auto rounded-md border">
                            <Table>
                                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Preço Un.</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {carrinho.length > 0 ? carrinho.map(item => (
                                        <TableRow key={item.produtoId}>
                                            <TableCell className="font-medium">{item.nomeProduto}</TableCell>
                                            <TableCell><Input type="number" value={item.quantidade} onChange={(e) => handleUpdateQuantidade(item.produtoId, parseInt(e.target.value))} className="w-20 h-8" /></TableCell>
                                            <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.precoUnitario)}</TableCell>
                                            <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.precoUnitario * item.quantidade)}</TableCell>

                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleUpdateQuantidade(item.produtoId, 0)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum item adicionado.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="text-right text-xl font-bold mt-4">
                            Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorTotalCarrinho)}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={carrinho.length === 0}>Salvar Venda</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <VisualizarPedidoModal
                pedido={viewingPedido}
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
            />
        </div>
    );
}