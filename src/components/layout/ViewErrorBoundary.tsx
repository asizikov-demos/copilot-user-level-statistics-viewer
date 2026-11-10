'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Banner } from '@primer/react';

interface ViewErrorBoundaryProps {
  children: ReactNode;
  resetKeys: readonly unknown[];
  onGoToOverview: () => void;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  resetKeys: readonly unknown[];
}

export default class ViewErrorBoundary extends Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  state: ViewErrorBoundaryState = {
    hasError: false,
    resetKeys: this.props.resetKeys,
  };

  static getDerivedStateFromProps(
    props: ViewErrorBoundaryProps,
    state: ViewErrorBoundaryState
  ): Partial<ViewErrorBoundaryState> | null {
    if (
      props.resetKeys.length !== state.resetKeys.length
      || props.resetKeys.some((key, index) => !Object.is(key, state.resetKeys[index]))
    ) {
      return { hasError: false, resetKeys: props.resetKeys };
    }
    return null;
  }

  static getDerivedStateFromError(): Partial<ViewErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Failed to render metrics view', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl py-16">
          <Banner
            variant="critical"
            title="Unable to display this view"
            description="Your metrics are still loaded. Try again or choose another view."
            primaryAction={
              <Banner.PrimaryAction onClick={() => this.setState({ hasError: false })}>
                Try again
              </Banner.PrimaryAction>
            }
            secondaryAction={
              <Banner.SecondaryAction
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onGoToOverview();
                }}
              >
                Go to overview
              </Banner.SecondaryAction>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
