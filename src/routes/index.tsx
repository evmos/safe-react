import React from 'react'
import { Loader } from '@gnosis.pm/safe-react-components'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { matchPath, Redirect, Route, Switch, useLocation } from 'react-router-dom'

import { LoadingContainer } from 'src/components/LoaderContainer'
import { useAnalytics } from 'src/utils/googleAnalytics'
import { lastViewedSafe } from 'src/logic/currentSession/store/selectors'
import {
  generateSafeRoute,
  getPrefixedSafeAddressSlug,
  LOAD_SPECIFIC_SAFE_ROUTE,
  OPEN_SAFE_ROUTE,
  ADDRESSED_ROUTE,
  SAFE_ROUTES,
  WELCOME_ROUTE,
  hasPrefixedSafeAddressInUrl,
  ROOT_ROUTE,
  LOAD_SAFE_ROUTE,
  getNetworkRootRoutes,
  TRANSACTION_ID_SLUG,
} from './routes'
import { getShortName } from 'src/config'
import { setChainId } from 'src/logic/config/utils'
import { switchNetworkWithUrl } from 'src/utils/history'
import { isDeeplinkedTx } from './safe/components/Transactions/TxList/utils'
import { useAddressedRouteKey } from './safe/container/hooks/useAddressedRouteKey'

const Welcome = React.lazy(() => import('./welcome/Welcome'))
const CreateSafePage = React.lazy(() => import('./CreateSafePage/CreateSafePage'))
const LoadSafePage = React.lazy(() => import('./LoadSafePage/LoadSafePage'))
const SafeContainer = React.lazy(() => import('./safe/container'))

const Routes = (): React.ReactElement => {
  const location = useLocation()
  const { pathname, search } = location
  const defaultSafe = useSelector(lastViewedSafe)
  const { trackPage } = useAnalytics()

  // Component key that changes when addressed route slug changes
  const { key } = useAddressedRouteKey()

  useEffect(() => {
    let trackedPath = pathname

    // Anonymize safe address
    if (hasPrefixedSafeAddressInUrl()) {
      trackedPath = trackedPath.replace(getPrefixedSafeAddressSlug(), 'SAFE_ADDRESS')
    }

    // Anonymize deeplinked transaction
    if (isDeeplinkedTx()) {
      const match = matchPath(pathname, {
        path: SAFE_ROUTES.TRANSACTIONS_SINGULAR,
      })

      trackedPath = trackedPath.replace(match?.params[TRANSACTION_ID_SLUG], 'TRANSACTION_ID')
    }

    trackPage(trackedPath + search)

    // Set the initial network id from the URL.
    // It depends on the chains
    switchNetworkWithUrl({ pathname })

    // Track when pathname changes
  }, [pathname, search, trackPage])

  return (
    <Switch>
      <Route
        // Remove all trailing slashes
        path="/:url*(/+)"
        render={() => <Redirect to={location.pathname.replace(/\/+$/, `${location.search}${location.hash}`)} />}
      />
      {
        // Redirection to open network specific welcome pages
        getNetworkRootRoutes().map(({ chainId, route }) => (
          <Route
            key={chainId}
            path={route}
            render={() => {
              setChainId(chainId)
              return <Redirect to={ROOT_ROUTE} />
            }}
          />
        ))
      }
      <Route
        exact
        path={ROOT_ROUTE}
        render={() => {
          if (defaultSafe === null) {
            return (
              <LoadingContainer>
                <Loader size="md" />
              </LoadingContainer>
            )
          }

          if (defaultSafe) {
            return (
              <Redirect
                to={generateSafeRoute(SAFE_ROUTES.ASSETS_BALANCES, {
                  shortName: getShortName(),
                  safeAddress: defaultSafe,
                })}
              />
            )
          }

          return <Redirect to={WELCOME_ROUTE} />
        }}
      />
      <Route component={Welcome} exact path={WELCOME_ROUTE} />
      <Route component={CreateSafePage} exact path={OPEN_SAFE_ROUTE} />
      <Route
        path={ADDRESSED_ROUTE}
        render={() => {
          // Rerender the container/reset its state when prefix/address changes
          return <SafeContainer key={key} />
        }}
      />
      <Route component={LoadSafePage} path={[LOAD_SAFE_ROUTE, LOAD_SPECIFIC_SAFE_ROUTE]} />
      <Redirect to={ROOT_ROUTE} />
    </Switch>
  )
}

export default Routes
