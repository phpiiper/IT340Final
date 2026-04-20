import { Component, signal, OnInit, input, resource, computed } from '@angular/core';
import {Router} from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Card} from './card';

export interface CardType {
  _id: string;
  cost: number,
  expansion: string;
  name: string;
  path: string;
  types: string[];
}
export interface CardFilterType {
  expansions: string[];
  name: string;
  types: string[];
  maxCost: number;
  minCost: number;
}
export interface DeckType {
  name: string;
  tags: string[];
  cards: CardType[];
  maxCards: number;
}

@Component({
  selector: 'CreatePage',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule, MatTabsModule, ReactiveFormsModule, MatExpansionModule, Card],
  templateUrl: './createPage.html',
})
export class CreatePage implements OnInit{
  constructor(private router: Router){}

  ngOnInit(){
    this.fetchUser().then(res => {
        if (!res.verify){
            this.router.navigate(['/']).then(() => {})
            return
        }
        console.log(res)
        this.user.set(res.verify)
      })
    }

  async fetchUser(){
    const res = await fetch("http://localhost:3000/api/auth/checkLogin",{
      credentials: "include",
    });
    return await res.json();
  }
  user = signal({
    username: 'Guest',
    email: '<EMAIL>',
    role: "user"
  });

  filterForm = new FormGroup({
    name: new FormControl('', Validators.required),
    maxCost: new FormControl(6, Validators.required),
    minCost: new FormControl(0, Validators.required),
  });
  async filterHandler(){
    const filterObj = this.filterForm.value;
    this.cardFilters.update(prev => ({
      ...prev,
      name: filterObj.name || "",
      types: [],
      maxCost: 6, minCost: 0
    }))
  }
  cardFilters= signal<CardFilterType>({
    name: "",
    expansions: [],
    types: [],
    maxCost: 6, minCost: 0
  })

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
  expansions = computed(():string[] => {
    const c = this.cards.value() ?? [];
    return [...new Set<string>(c.map((x: CardType) => x.expansion))]
  });
  deck = signal<DeckType>({
    name: "Deck",
    cards: [],
    maxCards: 10,
    tags: []
  })

  filteredCards = computed(() => {
    const c = this.cards.value() || [];
    // console.log("FILTERS", this.cardFilters(), this.deck().cards)
    const newCards = c.filter((x : any) => {
      if (!x.name.toLowerCase().includes(this.cardFilters().name.toLowerCase())) {return false}
      if (this.cardFilters().expansions.length > 0 && !this.cardFilters().expansions.includes(x.expansion)) {return false}
      // @ts-ignore
      if (this.deck().cards.some(d => d._id === x._id)) {return false}
      // if in deck
      return true
    })
    return newCards
  });

  addCardToDeck(name: string){
    const found = this.cards.value().find((x: any) => x.name === name)
    if (!found) {return}
    if (this.deck().cards.length >= this.deck().maxCards) {return}
    if (this.deck().cards.some(x => x._id === found._id)) {return}
    this.deck.update((prev: any) => ({
      ...prev, cards: [...prev.cards, found]
    }))
    // console.log(this.deck())
  }
  removeCardFromDeck(name: string){
    this.deck.update((prev: any) => ({
      ...prev, cards: prev.cards.filter((x: any) => x.name !== name)
    }))
    // console.log(this.deck())
  }

  addFilter(type:string, value:any){
    // console.log(144, type, value)
    if (type === "expansion"){
      if (this.cardFilters().expansions.includes(value)) {
        console.log(146, this.cardFilters().expansions.filter(x => x!==value))
        this.cardFilters.update((prev: any) => ({
          ...prev, expansions: prev.expansions.filter((x: any) => x !== value)
        }))
        return
      }
      this.cardFilters.update((prev: any) => ({
        ...prev, expansions: [...prev.expansions, value]
      }))
      // console.log(155, this.cardFilters().expansions.filter(x => x!==value))
    } else {
      this.cardFilters.update((prev: any) => ({
        ...prev, [type]: value
      }))
    }
    // console.log(158, this.cardFilters())
  }

  showExpansionFilter = signal(false)
  toggleExpansionFilter(){
    this.showExpansionFilter.update(prev => !prev)
  }

  disableSaving = signal(false)
  saveDeck(){
    console.log(this.deck())
    this.disableSaving.set(true)
    fetch("http://localhost:3000/api/deck/create",{
      method: "POST",
      body: JSON.stringify(this.deck()),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }).then(async res => {
      console.log(res)
      const data = await res.json();
      if (!data || data.error){
        console.log("ERR! show this later???")
        console.log(data?.message || "Unknown error!")
      } else {
        window.location.href = `/deck/${data.deckId}`
      }
      this.disableSaving.set(false)
    })
  }

  async logout(){
    const r = await fetch("http://localhost:3000/api/auth/signOut",{
      credentials: "include",
    })
    // console.log(await r.json())
    window.location.reload()
  }

  logDeck(){
    console.log(62, this.deck())
  }
  updateMaxCards(e: any){
    if (isNaN(e.target.value) || e.target.value < 1){
      return
    }
    this.deck.update((prev: any) => ({
      ...prev, maxCards: JSON.parse(e.target.value)
    }))
    if (this.deck().maxCards <= this.deck().cards.length){
      this.deck.update((prev: any) => ({
        ...prev, maxCards: prev.cards.length
      }))
    }
  }

}
