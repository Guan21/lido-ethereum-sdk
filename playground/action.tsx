import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Button, Accordion as OriginalAccordion } from '@lidofinance/lido-ui';
import { PropsWithChildren, useReducer } from 'react';
import { type SDKError } from '@lidofinance/lido-ethereum-sdk';
import {
  ActionBlock,
  Controls,
  ErrorMessage,
  ResultCode,
  SuccessMessage,
} from './styles';
import { useWeb3 } from 'reef-knot/web3-react';

const Accordion = OriginalAccordion as unknown as React.ComponentType<{
  summary: ReactNode;
  children?: ReactNode;
}>;

const ReactJSON = dynamic(() => import('react-json-view'), {
  ssr: false,
});

type ActionProps<TResult> = PropsWithChildren<{
  action: () => Promise<TResult> | TResult;
  title: string;
  renderResult?: (result: TResult) => JSX.Element;
  renderError?: (error: SDKError) => JSX.Element;
  walletAction?: boolean;
  children?: ReactNode;
}>;

type ReducerAction<TResult> =
  | { type: 'loading' }
  | { type: 'error'; error: SDKError }
  | { type: 'success'; result: TResult }
  | { type: 'reset' };

type ReducerState<TResult> = {
  loading: boolean;
  error?: SDKError;
  result?: TResult;
};

const reducer = <TResult,>(
  state: ReducerState<TResult>,
  action?: ReducerAction<TResult>,
): ReducerState<TResult> => {
  switch (action?.type) {
    case 'loading':
      return { error: undefined, result: undefined, loading: true };
    case 'error':
      return { error: action.error, result: undefined, loading: false };
    case 'success':
      return { error: undefined, result: action.result, loading: false };
    case 'reset':
      return { error: undefined, result: undefined, loading: false };
    default:
      return state;
  }
};

const defaultRenderError = (error: SDKError): JSX.Element => {
  return (
    <Accordion
      summary={
        <ErrorMessage>
          {error.code}:{String(error.errorMessage).slice(0, 30) + '...'}
        </ErrorMessage>
      }
    >
      <ErrorMessage>{String(error.errorMessage)}</ErrorMessage>
    </Accordion>
  );
};

const defaultRenderResult = <TResult,>(result: TResult): JSX.Element => {
  const stringfyed = JSON.stringify(
    result,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );

  if (typeof result !== 'object') {
    return <ResultCode>{stringfyed}</ResultCode>;
  }
  return (
    <Accordion summary={<SuccessMessage>Success</SuccessMessage>}>
      <ReactJSON
        theme={'pop'}
        name={null}
        displayDataTypes={false}
        src={JSON.parse(stringfyed)}
        collapseStringsAfterLength={30}
      />
    </Accordion>
  );
};

export const Action = <TResult,>({
  action,
  title,
  walletAction = false,
  renderResult = defaultRenderResult,
  renderError = defaultRenderError,
  children,
}: ActionProps<TResult>) => {
  const { active } = useWeb3();
  const [{ result, error, loading }, dispatch] = useReducer(reducer<TResult>, {
    error: undefined,
    result: undefined,
    loading: false,
  });

  const startLoading = async () => {
    try {
      dispatch({ type: 'loading' });
      const result = await action();
      dispatch({ type: 'success', result });
    } catch (error) {
      console.error(error);
      dispatch({ type: 'error', error: error as SDKError });
    }
  };

  return (
    <ActionBlock>
      {children && <Controls>{children as ReactNode}</Controls>}
      <Controls>
        <Button
          disabled={walletAction && !active}
          loading={loading}
          onClick={startLoading}
        >
          {title}
        </Button>
        {result !== undefined && renderResult(result)}
        {!!error && renderError(error)}
      </Controls>
    </ActionBlock>
  );
};
