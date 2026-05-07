import { Component, signal, input, output } from '@angular/core';
import {MatButton} from '@angular/material/button';
import {CardType} from './createPage';

// <LOG>
@Component({
  selector: 'log',
  imports: [],
  template: `
    <div class="log-div">
      <span class="level {{level().toLowerCase()}}">{{level()}}</span>
      <span class="api">{{ api() }} </span>
      <span class="date">[{{date()}}]  </span>
      <span class="action">{{ action() }}</span>
      <span class="description">{{ description() }}</span>
    </div>
  `
})
export class Log {
  level = input('level');
  api = input('api');
  date = input('date');
  action = input('action');
  description = input('description');
}
