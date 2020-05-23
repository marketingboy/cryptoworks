
const PubNub    =   require('pubnub');

const credentials = {
    publichKey  :   'pub-c-07cc364c-12ce-4924-988f-0cef14aca9e2',
    subscribeKey:   'sub-c-e358ccf2-1bbb-11ea-a8ee-866798696d74',
    secretKey   :   'sec-c-MGY2MjRmMTktZWQzNC00ODI3LWFkOTktMDVkODNhYTVmNjQx'
};

const CHANNELS = {
    TEST: 'TEST'
}

class PubSub
{
    constructor()
    {
        this.pubnub     =   new PubNub(credentials);

        this.pubnub.subscribe({ channels: Object.values(CHANNELS) });

        this.pubnub.addListener(this.listener());
    }

    listener()
    {
        return {
            message: messageObject => {
                const {channel, message }   =   messageObject;

                console.log(`Message recieved. Channel: ${channel}. Message: ${message} `)
            }
        }
    }

    publish({ channel, message })
    {
        this.pubnub.publish({ channel, message });
    }
}

const testPubSub = new PubSub();

testPubSub.publish({ channel: CHANNELS.TEST, message: 'hello pubnub' });
module.exports = PubSub;