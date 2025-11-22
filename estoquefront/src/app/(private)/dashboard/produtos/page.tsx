'use client';
import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useRouter } from 'next/navigation';


const API_URL = 'http://localhost:5188/api/estoque';

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  quantidadeEmEstoque: number;
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null as number | null,
    nome: '',
    descricao: '',
    preco: 0,
    quantidadeEmEstoque: 0
  });

  const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();

      if (!token) {
        toast.error("Você não está autenticado.");
        router.push('/login'); 
        return; 
      }

      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sua sessão expirou. Por favor, faça login novamente.");

          localStorage.removeItem('authToken');

          router.push('/login');
        }
        
        throw new Error("Falha na autorização.");
      }

      const data = await response.json();
      setProdutos(data);
    } catch (error: any) {
  
      if (error.message !== "Falha na autorização.") {
        toast.error("Não foi possível carregar os produtos.");
      }
    } finally {
      setIsLoading(false);
    }
  
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'preco' || name === 'quantidadeEmEstoque' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddNew = () => {
    setFormData({ id: null, nome: '', descricao: '', preco: 0, quantidadeEmEstoque: 0 });
    setIsDialogOpen(true);
  };

  const handleEdit = (produto: Produto) => {
    setFormData(produto);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const token = getAuthToken();
    const isEditMode = !!formData.id;

    
    const payload = {
      Nome: formData.nome,
      Descricao: formData.descricao,
      Preco: Number(formData.preco),
      QuantidadeEmEstoque: Number(formData.quantidadeEmEstoque),
    };

    if (isEditMode) {
      (payload as any).Id = formData.id;
    }

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `${API_URL}/${formData.id}` : API_URL;

    const promise = fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).then(async response => {
      console.log("--- DEBUG: 4. Resposta recebida da API ---", response);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error("Falha ao salvar o produto. Verifique os dados.");
      }
      return response;
    });

    toast.promise(promise, {
      loading: 'Salvando...',
      success: () => {
        setIsDialogOpen(false);
        fetchData();
        return `Produto salvo com sucesso!`;
      },
      error: (err) => `Erro: ${err.message}`,
    });
  };

  return (

    <div>
  
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gerenciamento de Produtos</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center">Carregando...</TableCell></TableRow>
            ) : produtos.length > 0 ? (
              produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produto.preco)}</TableCell>
                  <TableCell>{produto.quantidadeEmEstoque}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(produto)}>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum produto encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">Nome</Label>
              <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">Descrição</Label>
              <Input id="descricao" name="descricao" value={formData.descricao} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="preco" className="text-right">Preço</Label>
              <Input id="preco" name="preco" type="number" step="0.01" value={formData.preco} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantidadeEmEstoque" className="text-right">Estoque</Label>
              <Input id="quantidadeEmEstoque" name="quantidadeEmEstoque" type="number" value={formData.quantidadeEmEstoque} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>

        </DialogContent>
      </Dialog>
    </div>

  );
}