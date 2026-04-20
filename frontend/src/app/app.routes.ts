import { Routes } from '@angular/router';
import { LoginPage } from '../../components/loginpage';
import { CreatePage } from '../../components/createPage';
import { DeckPage } from '../../components/deckPage';
import { DecksPage } from '../../components/decksPage';

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
  }
];
