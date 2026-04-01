import { Component, signal, input } from '@angular/core';
import {MatButton} from '@angular/material/button';

// <CARD>
@Component({
  selector: 'plp-card',
  imports: [
    MatButton
  ],
  template: `
    <button
      matButton="outlined"
      style="height: fit-content; width: fit-content; padding: 0.25rem; border-radius: 4px;"
    >
      <div
        class="dom-card-container"
        style="background-image: url({{ card().image }})"
      >
      </div>
      <span>{{ cardName() }}</span>
    </button>
  `
})
export class Card {
  cardName = input('CardName');
  card = signal({
    name: 'Amulet',
    expansion: 'Adventures',
    image: 'cards/adventures_amulet.jpg',
    description: 'Now and at the start of your next turn, choose one: +1; or trash a card from your hand; or gain a Silver.',
    cost: '13',
    type: 'Action-Duration',
  });
}
