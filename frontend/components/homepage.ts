import { Component, signal, input } from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Card} from './card';


// <CARD>
@Component({
  selector: 'homepage',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule, MatTabsModule, ReactiveFormsModule,MatExpansionModule,Card],
  templateUrl: './homepage.html',
})
export class HomePage {
  cards = signal([{
    name: 'Amulet',
    expansion: 'Adventures',
    image: 'cards/adventures_amulet.jpg',
    description: 'Now and at the start of your next turn, choose one: +1; or trash a card from your hand; or gain a Silver.',
    cost: '13',
    type: 'Action-Duration',
  }]);

  loginTab = signal(0);
  swapTab = (tab: number) => this.loginTab.set(tab);
  isLoggedIn = signal(false);
  loginHandler() {
      const signinObj = this.profileForm.value;
    console.log('Log in clicked');
    console.log(this.profileForm.value)

    this.isLoggedIn.set(true);
    this.user.update(prev => ({
      ...prev, username: signinObj.username || ""
    }))
  }
  user = signal({
    username: 'Guest',
    email: '<EMAIL>'
  });
  profileForm = new FormGroup({
    username: new FormControl('username', Validators.required),
    password: new FormControl('pw', Validators.required),
  });
  async test(){
    console.log("TEST POINT")
      const url = `https://wiki.dominionstrategy.com/api.php?` +
        new URLSearchParams({
          action: "parse",
          page: "Intrigue",
          format: "json",
          origin: "*"
        });

      const res = await fetch(url);
      const data = await res.json();

      console.log(data)

      return {
        title: data.parse.title,
        html: data.parse.text["*"],   // full rendered HTML
        categories: data.parse.categories
      };
  }
}
