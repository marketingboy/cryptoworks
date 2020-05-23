
import React from 'react';
import { render } from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';
import history from './history';
import App from './component/App';
import Blocks from './component/Blocks';
import ConductTransaction from './component/ConductTransaction';
import TransactionPool from './component/TransactionPool';
import './index.css';
render(
<Router history={history}>
    <Switch>
        <Route exact={true} path='/' component={App} />
        <Route path='/blocks' component={Blocks} />
        <Route path='/conduct-transaction' component={ConductTransaction} />
        <Route path='/transaction-pool' component={TransactionPool} />
    </Switch>
</Router>, 
document.getElementById('root')
);


