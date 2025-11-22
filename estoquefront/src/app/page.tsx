'use client';
import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="fixed top-0 left-0 right-0 z-20 w-full border-b border-black/[.08] bg-white/80 backdrop-blur-lg dark:border-white/[.145] dark:bg-black/80">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://images.seeklogo.com/logo-png/44/1/avanade-logo-png_seeklogo-446973.png"
              alt="Avanade Logo"
              width="50"
            />
          </a>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex h-9 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:bg-zinc-50 dark:text-black dark:hover:bg-[#ccc]"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:bg-zinc-50 dark:text-black dark:hover:bg-[#ccc]"
            >
              Ir para Login
            </Link>
          )}
        </nav>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tighter text-black dark:text-zinc-50 sm:text-5xl md:text-6xl">
            Desafio Avanade: Sistema de Estoque
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Front-End criado pra mostrar as funções do back-end de forma visual em um sistema simples.tecnologias usadas no projeto DOTNET E NEXT(shadui e tailwind)
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Acessar Sistema
          </Link>
          <a
            href="https://github.com/viniciusbarboosa/desafio-avanade-dotnet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-8 text-base font-semibold transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] sm:w-auto"
          >
            Ver Código no GitHub
          </a>
        </div>
      </main>

      <footer className="w-full py-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Desenvolvido para o Desafio Avanade.
        </p>
      </footer>
    </div>
  );
}