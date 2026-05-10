import { Component, signal, OnInit, input, resource, computed } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Card} from './card';
import {environment} from '../src/environments/environment';

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
  description: string;
  type: string;
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
  constructor(private router: Router, private route: ActivatedRoute){}

  ngOnInit(){
  /*
      INIT
   */
   let user:any = null;
    this.fetchUser().then(res => {
        if (!res.verify){
            this.router.navigate(['/']).then(() => {})
            return
        }
        console.log(res)
        this.user.set(res.verify)
        user = res.verify;
      })
    this.route.queryParamMap.subscribe(params => {
      const edit = params.get('edit');
      if (edit) {
          // fetch deck
          const res = fetch(`${environment.backend}/api/deck`,{
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ id: edit })
          }).then(async (r) => {
              if (!r.ok){return}
              const d = await r.json();
              if (d.error){return console.log(`ERR`,d.message)}
              if (user && user.id !== d.deck.author){return console.log("access denied to edit deck")}
              // can edit...
              this.deck.set(d.deck)
          });
      }
    });

  }

  async fetchUser(){
    const res = await fetch(`${environment.backend}/api/auth/checkLogin`,{
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

    // @ts-ignore
    this.cardFilters.update(prev => ({
      ...prev,
      name: filterObj.name || "",
      minCost: filterObj.minCost ?? 0,
      maxCost: filterObj.maxCost ?? 8
    }))
  }
  cardFilters= signal<CardFilterType>({
    name: "",
    expansions: [],
    types: [],
    maxCost: 6, minCost: 0
  })

  resetFilters() {
    this.closeFilters()
    this.cardFilters.update(prev => ({
      ...prev,
      name: "",
      minCost: 0,
      maxCost: 8,
      types: [],
      expansions: []
    }))
    this.card_size.set("lg")
  }

  cards = resource({
    loader: async ()=>{
      try {
        const res = await fetch(`${environment.backend}/api/cards?&itemsPerPage=351`);
        const data = await res.json();
        // console.log(data?.cards);
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
  costs = computed(():number[] => {
    const c = this.cards.value()?.map((x:CardType) => x.cost) ?? [];
    return [Math.min(...c), Math.max(...c)]
  });
  types = computed(():string[] => {
    const c = this.cards.value() ?? [];
    return [...new Set<string>(c.map((x: CardType) => x.types).flatMap((x:any) => x))]
  });

  defaultDeck = {
    name: "Deck",
    type: "Public",
    cards: [],
    description: "",
    maxCards: 10,
    tags: [],
  }

  deck = signal<DeckType>(this.defaultDeck)

  filteredCards = computed(() => {
    const c = this.cards.value() || [];

   //  console.log("FILTERS", this.cardFilters(), this.deck().cards)

    const newCards = c.filter((x : any) => {
      // 1. Check for name match
      if (!x.name.toLowerCase().includes(this.cardFilters().name.toLowerCase())) {return false}
      // 2. Check for expansions match
      if (this.cardFilters().expansions.length > 0 && !this.cardFilters().expansions.includes(x.expansion)) {return false}
      // 3. Check for types match
      if (this.cardFilters().types.length > 0 && !this.cardFilters().types.some(t => x.types.includes(t))) { return false }
      //
      // @ts-ignore
      // 4. Check if in deck
      if (this.deck().cards.some(d => (d?._id || d) === x._id)) {return false}
      // 5. Check for MAX and MIN costs

      if (x.cost > this.cardFilters().maxCost || x.cost < this.cardFilters().minCost) {return false}

      return true
    })
    return newCards
  });

  addCardToDeck(name: string){
    if (this.runningAI() || this.disableSaving()) {return}
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
    if (this.runningAI() || this.disableSaving()) {return}
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
    } else if (type === "types"){
      if (this.cardFilters().types.includes(value)) {
        console.log(83, this.cardFilters().types.filter(x => x!==value))
        this.cardFilters.update((prev: any) => ({
          ...prev, types: prev.types.filter((x: any) => x !== value)
        }))
        return
      }
      this.cardFilters.update((prev: any) => ({
        ...prev, types: [...prev.types, value]
      }))
    }else {
      this.cardFilters.update((prev: any) => ({
        ...prev, [type]: value
      }))
    }
    // console.log(158, this.cardFilters())
  }

  closeFilters(){
    this.showTypeFilter.update(prev => false)
    this.showExpansionFilter.update(prev => false)
    this.showDeckPage.update(prev => false)
  }
  showExpansionFilter = signal(false)
  toggleExpansionFilter(){
    if (!this.showExpansionFilter()){
      // opening... so close all others
      this.closeFilters()
    }
    this.showExpansionFilter.update(prev => !prev)
  }

  showTypeFilter = signal(false)
  toggleTypeFilter(){
    if (!this.showTypeFilter()){
      // opening... so close all others
      this.closeFilters()
    }
    this.showTypeFilter.update(prev => !prev)
  }


  showDeckPage = signal(true)
  toggleDeckPage(){
    if (!this.showDeckPage()){
      // opening... so close all others
      this.closeFilters()
    }
    this.showDeckPage.update(prev => !prev)
  }

  disableSaving = signal(false)
  async saveDeck(event:Event){
    event.preventDefault();
    if (this.runningAI()){return}
    console.log(this.deck())
    this.disableSaving.set(true)
    let finDeck:any = this.deck()
    try {
      if (finDeck._id){
        // updating a deck
        finDeck = {...finDeck,
          cards: finDeck.cards.map((x:any) => x?._id || x)
        }
        console.log(finDeck)
        const res = await fetch(`${environment.backend}/api/deck/update`,{
          method: "POST",
          body: JSON.stringify({
            method: "update",
            deck: finDeck
          }),
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
        const d = await res.json()
        if (d.error) {return console.log("UPDATE Data Res Error: ", d.message)}
        console.log(d)
        // window.location.href = `/deck/${d.deckId}`
      } else {
        // create new deck
        const res = await fetch(`${environment.backend}/api/deck/create`,{
          method: "POST",
          body: JSON.stringify(finDeck),
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
        const d = await res.json()
        if (d.error) {return console.log("CREATE Data Res Error: ", d.message)}
        window.location.href = `/deck/${d.deckId}`
      }
    } catch (error) {
      console.log(error)
    } finally {
      this.disableSaving.set(false)
    }
  }

  async logout(){
    const r = await fetch(`${environment.backend}/api/auth/signOut`,{
      credentials: "include",
    })
    // console.log(await r.json())
    window.location.reload()
  }

  logDeck(){
    console.log("Current Deck", this.deck())
    console.log("All Cards", this.cards.value())
  }
  resetDeck(){
    if (this.runningAI() || this.disableSaving()){return}
    this.deck.set(this.defaultDeck)
  }
  updateMaxCards(int:number){
    if (this.runningAI() || this.disableSaving()){return}
    this.deck.update((prev: any) => ({
      ...prev, maxCards: int
    }))
    if (this.deck().maxCards <= this.deck().cards.length){
      this.deck.update((prev: any) => ({
        ...prev, maxCards: prev.cards.length
      }))
    }
  }
  decrease_card_count(int:number) {
    if (this.runningAI() || this.disableSaving()){return}
    const newAmt = this.deck().maxCards - int;
    if (newAmt !== 0 && newAmt >= this.deck().cards.length){
      this.deck.update((prev: any) => ({
        ...prev, maxCards: newAmt
      }))
    }
  }
  increase_card_count(int:number) {
    if (this.runningAI() || this.disableSaving()){return}
    const newAmt = this.deck().maxCards + int;
    this.deck.update((prev: any) => ({
      ...prev, maxCards: newAmt
    }))
  }

  deck_type = signal("Public")
  toggle_deck_type(){
    if (this.runningAI() || this.disableSaving()){return}
    let options = ["Public", "Private", "Password"]
    let i_ind = options.findIndex(x => x === this.deck_type()) + 1
    if (i_ind === options.length) {i_ind = 0}
    this.deck_type.set(options[i_ind])
    this.updateDeckInfo("type",options[i_ind])
  }
  password = signal("")
  showPassword = signal(false);
  toggle_password_view(){
    this.showPassword.update(prev => !prev)
  }

  card_size = signal("lg")
  toggle_card_size(){
      let options = ["lg","md","sm"]
      let i_ind = options.findIndex(x => x === this.card_size()) + 1
      if (i_ind === options.length) {i_ind = 0}
      this.card_size.set(options[i_ind])
  }

  updateDeckInfo(type:string, event:any){
    if (this.runningAI() || this.disableSaving()){return}
    if (["name","description","type","password"].includes(type)){
        let value = typeof event === "object" && event?.target ? (event.target as HTMLInputElement).value : event;
        this.deck.update(x => ({
          ...x,
          [type]: value || ""
        }))
    }
    if (type === "tags"){
      let value = typeof event === "object" && event?.target ? (event.target as HTMLInputElement).value : event;
      // if input is direct...
      if (Array.isArray(value) && value.length > 0 && !value.find(x => typeof x !== "string")) {
        this.deck.update(x => ({ ...x, tags: value || [] }))
      } else if (typeof value === "string" && value.replaceAll(" ","").length > 0){
          // if string
        this.deck.update(x => ({ ...x, tags: value.split(",").map(t => t.replaceAll(" ","")) || [] }))

      }
    }
  }

  runningAI = signal(false)
  showPromptPopup = signal(false)
  toggleShowPromptPopup() { this.showPromptPopup.update(x => !x) }
  promptForm = new FormGroup({
    message: new FormControl('Generate a deck by selecting two cards at random and create the deck around their abilities/types.', Validators.required)
  });
  async generateDeck(message: string){
      if (this.disableSaving()){return false}
      const r = await fetch(`${environment.backend}/api/ai/deck`,{
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message
        })
      })
      console.log(r)
      if (r.ok){
          let dt = await r.json()
          if (dt.error) {
            console.log("ERR 2",dt.message)
          } else {
            return dt.message // OBJ
          }
      } else {
        console.log("gd ERROR", r)
      }
  }
  async generateDeckHandler(event: Event){
      event.preventDefault()
      try {
          this.runningAI.set(true)
          const res = await this.generateDeck(this.promptForm.value.message || "")
        console.log(res)
          if (!res) {
            console.log("ERR")
            return
          }
          const mappedCards = Array.isArray(res?.cards) ? (
              res.cards.map((x:any) => this.cards.value().find((y:any) => y._id === x))
          ) : []
          this.deck.update(x => x = {...x,
              cards: mappedCards,
              maxCards: res.maxCards,
              name: res.name,
              tags: res.tags,
          })
          this.showPromptPopup.set(false)
      } catch (e){
        console.log(e)
      } finally {
        this.runningAI.set(false)
      }
  }

}
