import React from 'react';

interface EBProps {
  children: React.ReactNode;
}

interface EBState {
  hasError: boolean;
}

/**
 * Error Boundary global — previne tela branca quando um componente crasheia.
 */
export class ErrorBoundary extends React.Component<EBProps, EBState> {
  declare state: EBState;
  declare props: EBProps & { children: React.ReactNode };

  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-gray-50 px-4',
    },
      React.createElement('div', { className: 'text-center max-w-md' },
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Algo deu errado'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 'Ocorreu um erro inesperado. Tente recarregar a página.'),
        React.createElement('div', { className: 'flex gap-3 justify-center' },
          React.createElement('button', {
            onClick: () => window.location.reload(),
            className: 'px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors',
          }, 'Recarregar página'),
          React.createElement('button', {
            onClick: () => { window.location.hash = '/'; window.location.reload(); },
            className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors',
          }, 'Ir para início'),
        ),
      ),
    );
  }
}
