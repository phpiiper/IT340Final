import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Card} from '../../components/card';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule, MatTabsModule, ReactiveFormsModule,MatExpansionModule,Card],
  templateUrl: './app.html',
  styleUrl: './app.css'
})



export class App {
  protected readonly title = signal('Homepage');
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
