import { Routes } from '@angular/router';
import { LoginPage } from '../../components/loginpage';
import { CreatePage } from '../../components/createPage';
import { DeckPage } from '../../components/deckPage';
import { DecksPage } from '../../components/decksPage';
import { AdminPage } from '../../components/adminPage';
import { AccountPage } from '../../components/accountPage';
import { PageNotFound } from '../../components/pageNotFoundPage';

export const routes: Routes = [
  {
    path: '',
    component: LoginPage
  },
  {
    path: 'create',
    component: CreatePage
  },
  {
    path: "deck/:id",
    component: DeckPage
  },
  {
    path: "decks",
    component: DecksPage
  },
  {
    path: "admin",
    component: AdminPage
  },
  {
    path: "account",
    component: AccountPage
  },
  {
    path: "**",
    component: PageNotFound
  }
];
