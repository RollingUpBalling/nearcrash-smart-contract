import {
  NearContract,
  NearBindgen,
  call,
  view,
  near,
  LookupMap,
  UnorderedSet,
  UnorderedMap, Vector,
} from 'near-sdk-js';


function formatToYocto(number): number {
  let newNumber = number.toString();
  return Number(newNumber + Math.pow(10, -24).toString().split('.')[1]);
}

function assert(b, str) {
  if (b) {
    return
  } else {
    throw Error("assertion failed: " + str)
  }
}

class TokenMetadata {

 token_id: string;
  title: string;
  description: string;
  hat: string;
  background: string;
  pet: string;
  flag: string;
  media: string;
  body: string;
  face: string;

  constructor(token_id, title, description, hat, background, pet, flag, media, body, face) {
    this.token_id = token_id;
    this.title = title;
    this.description = description;
    this.hat = hat;
    this.background = background;
    this.pet = pet;
    this.flag = flag;
    this.media = media;
    this.body = body;
    this.face = face;
  }
}

class Token {

  token_id: string;
  owner_id: string;
  metadata: TokenMetadata;
  constructor(token_id, owner_id, metadata) {
    this.token_id = token_id;
    this.owner_id = owner_id;
    this.metadata = metadata;
  }
}


interface TokensPerOwner {
  receiver_id: string,
  token: Token
}

@NearBindgen
class NftContract extends NearContract {

  owner_id: string;
  tokens_per_owner: LookupMap<string, Vector<Token>>
  token_metadata_by_id: LookupMap<string, TokenMetadata>;
  tokens_count: number;
  metadata: any;

  constructor({owner_id}) {
    super()
    this.owner_id = owner_id
    this.tokens_per_owner = new LookupMap('per_ownering1', {Token, Vector,})
    this.token_metadata_by_id = new LookupMap('LoookupTrash', {TokenMetadata})
    this.tokens_count = 0
    this.metadata = {
      spec: "nft-nearcrash-test-1.0.3",
      name: "NEARCRASH",
      symbol: "NEARCRASH",
      icon: "https://nearcrash.io/favicon.0f1069a7.png",
    }
  }

  deserialize() {
    super.deserialize()
    this.tokens_per_owner = new LookupMap('per_ownering1', {Token, Vector, TokenMetadata})

    this.token_metadata_by_id = new LookupMap('LoookupTrash', {TokenMetadata})
    // this.token_metadata_by_id.keys = Object.assign(new Vector, this.token_metadata_by_id.keys)
    // this.token_metadata_by_id.values = Object.assign(new Vector, this.token_metadata_by_id.values)

  }


  refund() {
    // const promise = near.promiseReturn(Account.transfer())

    // near.promiseBatchActionFunctionCall(promise, 'transfer', bytes(JSON.stringify({
    //   senderId: this.owner_id,
    //   msg: "refund from nearcrash mint"
    // })), 0, 30000000000000);
  }


  @view
  nft_metadata() {
    return this.metadata;
  }

  @call
  nft_tokens_for_owner(
    {
      account_id,
      from_index,
      limit,
    }) {
    const items = this.tokens_per_owner.get(account_id);
    near.log(`over there ${JSON.stringify(items.toArray())}` );

    if (!items) {
      return [];
    }

    let start = from_index || 0;

    near.log('here' + JSON.stringify(items.toArray()));

    return items.toArray();


  }


  @call
  nft_mint({receiver_id, count}: {receiver_id: string, count: number}) {


    let deposit = near.attachedDeposit();
    let oneNftPrice: number = formatToYocto("10");

    let nftCount = Number(count) || 1;

    let nftPrice = nftCount * oneNftPrice;

    if (Number(deposit) < nftPrice) {
      throw Error("deposit is not enough")
    }

    const tokens = []
    for (let i = 0; i < nftCount; i++) {
      let metadata = this.token_metadata_by_id.get(this.tokens_count.toString());

      if (!metadata) {
        throw Error("There are no available nfts for the mint")
      }

      let token = new Token(this.tokens_count.toString(), receiver_id, metadata);

      let tokensVector = this.tokens_per_owner.get(receiver_id);

      if(!tokensVector){
        tokensVector = new Vector<Token>(receiver_id.toString(), {Token, TokenMetadata});
      }

      near.log(`vector1: ${JSON.stringify(tokensVector.toArray())}`)

      tokensVector.push(token);

      near.log(`vector2: ${JSON.stringify(tokensVector.toArray())}`)

      this.tokens_per_owner.set(receiver_id, tokensVector)
      this.tokens_count++;
      tokens.push(token);
    }


    return tokens
  }

  @call
  setTokenCount({num}) {
    this.tokens_count = num;
    return this;
  }


  @call
  nftMetadata({token_id, title, description, hat, background, pet, flag, media, body, face}) {

    let sender_id = near.predecessorAccountId();
    assert(sender_id === this.owner_id, "Unauthorized" + sender_id)

    let metadata = new TokenMetadata(token_id, title, description, hat, background, pet, flag, media, body, face);

    this.token_metadata_by_id.set(
      token_id.toString(),
      new TokenMetadata(token_id, title, description, hat, background, pet, flag, media, body, face)
    );

    let subj = this.token_metadata_by_id.get(token_id.toString());

    near.log(JSON.stringify({subj}));

    near.log(`length: ${JSON.stringify(this.token_metadata_by_id)}`);

    return subj;
  }


  // TODO: add owner_ID somehow
  @view
  nftToken({token_id, owner_id}) {
    let metadata = this.token_metadata_by_id.get(token_id)
    return new Token(token_id, owner_id, metadata);
  }

  @view
  get_metadata({token_id}) {
    return this.token_metadata_by_id.get(token_id);
  }

  @view
  get_contract_data() {
    return JSON.stringify(this);
  }
}
