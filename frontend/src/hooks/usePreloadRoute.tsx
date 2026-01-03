import { useEffect } from 'react';

/**
 * Hook para pré-carregar componentes lazy com base em eventos do usuário
 */
export const usePreloadRoute = () => {
  const preloadComponent = (component: () => Promise<any>) => {
    // Inicia o carregamento do componente em background
    component().catch(() => {
      // Silenciosamente ignora erros de pré-carregamento
      // pois é apenas uma otimização, não essencial
    });
  };

  const preloadOnHover = (component: () => Promise<any>, element?: HTMLElement) => {
    const handleMouseEnter = () => {
      preloadComponent(component);
    };

    if (element) {
      element.addEventListener('mouseenter', handleMouseEnter, { once: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  };

  const preloadOnFocus = (component: () => Promise<any>, element?: HTMLElement) => {
    const handleFocus = () => {
      preloadComponent(component);
    };

    if (element) {
      element.addEventListener('focus', handleFocus, { once: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('focus', handleFocus);
      }
    };
  };

  const preloadOnVisible = (component: () => Promise<any>, element?: HTMLElement) => {
    if (!element || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            preloadComponent(component);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  };

  const preloadAfterDelay = (component: () => Promise<any>, delay: number = 2000) => {
    const timeoutId = setTimeout(() => {
      preloadComponent(component);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  };

  // Pré-carregar páginas baseadas em padrões de navegação comuns
  useEffect(() => {
    // Pré-carregar componentes comuns após um pequeno atraso
    const timeouts = [
      setTimeout(() => {
        // Pré-carregar página de projetos (página principal)
        import('@/pages/Projects');
      }, 1000),

      setTimeout(() => {
        // Pré-carregar página de tarefas
        import('@/pages/Tasks');
      }, 1500),

      setTimeout(() => {
        // Pré-carregar página de configurações (menos prioritária)
        import('@/pages/Settings');
      }, 3000)
    ];

    // Limpar timeouts no unmount
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return {
    preloadComponent,
    preloadOnHover,
    preloadOnFocus,
    preloadOnVisible,
    preloadAfterDelay
  };
};

export default usePreloadRoute;