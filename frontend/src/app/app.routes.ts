import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.components';
import { HomePage } from '../../components/homepage';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginComponent },
];
