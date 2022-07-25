import {NearContract, NearBindgen, call, view, near, LookupMap, bytes, UnorderedMap, Vector} from 'near-sdk-js';


function formatToYocto(number) {
  let newNumber = number.toString();
  return newNumber + Math.pow(10, -24).toString().split('.')[1];
}

function assert(b, str) {
  if (b) {
    return
  } else {
    throw Error("assertion failed: " + str)
  }
}

class TokenMetadata{
  constructor(token_id, title, description, hat, background, pet, flag, media, body, face) {
    this.token_id = token_id;
    this.title= title;
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
  constructor(token_id, owner_id, metadata) {
    this.token_id = token_id;
    this.owner_id = owner_id;
    this.metadata = metadata;
  }
}

@NearBindgen
class NftContract extends NearContract {
  constructor({owner_id, owner_by_id_prefix}) {
    super()
    this.owner_id = owner_id
    this.tokens_per_owner = new LookupMap(owner_by_id_prefix)
    this.token_metadata_by_id = new UnorderedMap(owner_by_id_prefix)
    this.tokens_count = 0
    this.metadata = {
      spec: "nft-nearcrash-test-1.0.2",
      name: "NEARCRASH",
      symbol: "NEARCRASH",
      icon: "https://nearcrash.io/favicon.0f1069a7.png",
    }
  }

  deserialize() {
    super.deserialize()
    this.tokens_per_owner = Object.assign(new LookupMap, this.tokens_per_owner)
    this.token_metadata_by_id = Object.assign(new UnorderedMap, this.token_metadata_by_id);
    this.token_metadata_by_id.keys = Object.assign(new Vector, this.token_metadata_by_id.keys)
    this.token_metadata_by_id.values = Object.assign(new Vector, this.token_metadata_by_id.values)
  }

  internalTransfer({sender_id, receiver_id, token_id, approval_id, memo}) {
    let owner_id = this.tokens_per_owner.get(token_id)

    assert(owner_id !== null, "Token not found")
    assert(sender_id === owner_id, "Sender must be the current owner")
    assert(owner_id !== receiver_id, "Current and next owner must differ")

    this.tokens_per_owner.set(token_id, receiver_id)

    return owner_id
  }

  refund(){
  // const promise = near.promiseReturn(Account.transfer())

    // near.promiseBatchActionFunctionCall(promise, 'transfer', bytes(JSON.stringify({
    //   senderId: this.owner_id,
    //   msg: "refund from nearcrash mint"
    // })), 0, 30000000000000);
  }


  @call
  nftMint({token_owner_id, count}) {


    let deposit = near.attachedDeposit();
    let oneNftPrice = formatToYocto("10");

    let nftCount = count || 1;

    let nftPrice = nftCount * oneNftPrice;

    if (deposit < nftPrice) {
      throw Error("deposit is not enough")
    }

    const tokens = []
    for(let i =0; i< nftCount; i++){
      let metadata = this.token_metadata_by_id.get(this.tokens_count.toString());

      if(!metadata) {
        throw Error("There are no available nfts for the mint")
      }

      let token = new Token(this.tokens_count.toString(), token_owner_id, metadata);

      this.tokens_per_owner.set(token_owner_id, this.tokens_count.toString())
      this.tokens_count++;
      tokens.push(token);
    }


    return tokens
  }

  @call
  setTokenCount({num}){
    this.tokens_count = num;
    return this;
  }


  @call
  nftMetadata({token_id, title, description, hat, background, pet, flag, media, body, face}){

    let sender_id = near.predecessorAccountId();
    assert(sender_id === this.owner_id, "Unauthorized" + sender_id)

    let metadata = new TokenMetadata({token_id, title, description, hat, background, pet, flag, media, body, face});

    this.token_metadata_by_id.set(
      token_id,
      JSON.stringify(metadata)
    );

    return metadata;
  }

  @view
  nftToken({token_id}) {
    let owner_id = this.tokens_per_owner.get(token_id)
    if (owner_id === null) {
      return null
    }
    let metadata = this.token_metadata_by_id.get(token_id)

    return new Token(token_id, owner_id, JSON.stringify(metadata));
  }

  @view
  get_metadata(){
    return this.token_metadata_by_id.toArray();
  }

  @view
  get_contract_data() {
    return JSON.stringify({metadata: this.metadata, tokens_count: this.tokens_count});
  }
}
