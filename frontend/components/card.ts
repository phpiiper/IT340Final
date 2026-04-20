import { Component, signal, input, output } from '@angular/core';
import {MatButton} from '@angular/material/button';
import {CardType} from './createPage';

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
      (click)="cardClick.emit()"
    >
      <div
        class="dom-card-container"
        style="background-image: url({{ path() }})"
      >
      </div>
      <span>{{ name() }}</span>
    </button>
  `
})
export class Card {
  name = input('name');
  path = input('path');
  expansion = input('expansion');
  card = input({})
  cardClick = output<void>();

}





// <CARD-POPUP>
@Component({
  selector: 'cardpopup',
  imports: [
    MatButton
  ],
  template: `
<div class="popup-parent">
  <div class="popup-content">
    <div
      style="height: fit-content; width: fit-content; padding: 0.25rem; border-radius: 4px;"
    >
      <div
        class="dom-card-container"
        style="background-image: url({{ path() }})"
      >
      </div>
    </div>
    <div class="dom-card-info">
      <h2>{{ name() }}</h2>
      <div class="cost"><strong>COST</strong>{{card().cost}}</div>
      <div class="description"><strong>DESC</strong>{{card().description}}</div>
      <div class="type"><strong>TYPE</strong>{{card().type}}</div>

    </div>
  </div>
</div>
  `
})
export class CardPopup {
  open = input(true);
  name = input('name');
  path = input('path');
  expansion = input('expansion');
  card = signal({
    description: 'Now and at the start of your next turn, choose one: +1; or trash a card from your hand; or gain a Silver.',
    cost: '13',
    type: 'Action-Duration',
  });
}
