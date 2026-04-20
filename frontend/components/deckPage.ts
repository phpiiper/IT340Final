import { Component, signal, OnInit, input, resource, computed } from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {Card} from './card';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {CardType} from './createPage';

export interface DeckType {
  _id: string;
  author: string;
  cards: CardType[];
  maxCards: number;
  name: string;
  tags: string[];
}

@Component({
  selector: 'CreatePage',
  imports: [Card, MatButton, ReactiveFormsModule],
  templateUrl: './deckPage.html',
})
export class DeckPage implements OnInit{
  constructor(private router: Router, private route: ActivatedRoute){}

  ngOnInit(){
    this.fetchDeck().then(res => {
        console.log(res)
      })
    }

  async fetchDeck(){
    this.loading.set(true);
    console.log(24, this.route.snapshot.paramMap.get("id"), this.passwordForm.value.password)
    const res = await fetch("http://localhost:3000/api/deck",{
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        id: this.route.snapshot.paramMap.get("id"),
        password: this.passwordForm.value.password || ""
      })
    });
    const data = await res.json();
    if (data.error){
      if (data.message === "Password required!"){
        this.passwordRequired.set(true)
      } else {
        console.log("other err :: ",data.message)
      }
    } else {
      if (data.deck){
        this.deck.set(data.deck)
        if (data.deck.password){
          this.deckUnlocked.set(true)
        }
      }
    }
    this.loading.set(false)
    return data;
  }
  password = signal("");
  passwordRequired = signal(false);

  loading = signal(true);
  deck = signal<any>(null)
  deckUnlocked = signal(false)

  cards = resource({
    loader: async ()=>{
      try {
        const res = await fetch(`http://localhost:3000/api/cards?&itemsPerPage=351`);
        const data = await res.json();
        return data?.cards || []
      } catch (e){
        console.log(e)
        return []
      }
    }
  })

  async logout(){
    const r = await fetch("http://localhost:3000/api/auth/signOut",{
      credentials: "include",
    })
    // console.log(await r.json())
    window.location.reload()
  }

  isLoading = signal(false);

  passwordForm = new FormGroup({
    password: new FormControl('oldpw', Validators.required),
  });
  async sendPassword(){
      this.isLoading.set(true);
      await this.fetchDeck()
      this.isLoading.set(false);
  }

}
