import MediaSession from '../src/index';
import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { MediaEvent } from '../src/events';
import {
    MessageType,
    MediaEventType,
    MediaContent,
    MediaContentType,
    AdBreak,
    AdContent,
    MediaStreamType,
    MpSDKInstance,
    Segment,
    QoS,
    EventType,
} from '../src/types';

let sandbox: SinonSandbox;
let mp: MpSDKInstance;
let mpMedia: MediaSession;
let song: MediaContent;

describe('mParticle Media SDK', () => {
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mp = {
            logBaseEvent: (event: MediaEvent) => {},
            logger: (message: string) => {},
        };

        song = {
            contentId: '023134',
            title: 'Immigrant Song',
            duration: 120000,
            contentType: MediaContentType.Video,
            streamType: MediaStreamType.OnDemand,
        };

        mpMedia = new MediaSession(
            mp,
            song.contentId,
            song.title,
            song.duration,
            song.contentType,
            song.streamType
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Media Event Listener', () => {
        beforeEach(() => {
            mpMedia.logPageEvent = false;
            mpMedia.logMediaEvent = false;
        });

        it('should fire a callback', () => {
            const bond = sinon.fake();

            mpMedia.mediaEventListener = bond;
            mpMedia.logPlay();
            mpMedia.logPause();
            mpMedia.logBufferStart(320, 20, 201);

            expect(
                bond.called,
                'Expected Media Event Listener Callback to have beeen called'
            ).to.eq(true);
            expect(bond.callCount).to.eq(3);

            expect(bond.args[0][0].name).to.eq('Play');
            expect(bond.args[1][0].name).to.eq('Pause');
            expect(bond.args[2][0].name).to.eq('Buffer Start');

            bond.args.forEach(arg => {
                expect(arg[0]).to.be.instanceOf(MediaEvent);
            });
        });

        it('should log MP Events', () => {
            const bond = sinon.spy(mp, 'logBaseEvent');

            mpMedia.logPlay();

            expect(
                bond.called,
                'Expected logBaseEvent to NOT have been called'
            ).to.eq(false);

            mpMedia.logPageEvent = true;
            mpMedia.logPlay();

            expect(
                bond.called,
                'Expected logBaseEvent to have been called'
            ).to.eq(true);
        });

        it('should log Media Events', () => {
            const bond = sinon.spy(mp, 'logBaseEvent');

            mpMedia.logPlay();

            expect(
                bond.called,
                'Expected logBaseEvent to NOT have been called'
            ).to.eq(false);

            mpMedia.logMediaEvent = true;
            mpMedia.logPlay();

            expect(
                bond.called,
                'Expected logBaseEvent to have been called'
            ).to.eq(true);
        });

        it('should fire an mp as a flat event', () => {
            const bond = sinon.spy(mp, 'logBaseEvent');

            mpMedia.logPageEvent = true;
            mpMedia.logMediaSessionStart();

            const expectedObject = {
                name: 'Media Session Start',
                messageType: MessageType.PageEvent,
                eventType: EventType.Media,
                data: {
                    content_id: '023134',
                    content_title: 'Immigrant Song',
                    content_duration: 120000,
                    content_type: 'Video',
                    stream_type: 'OnDemand',
                    playhead_position: 0,
                    media_session_id: mpMedia.sessionId,
                },
            };

            expect(
                bond.args[0][0],
                'Expected Media event to be an MPEvent'
            ).to.eqls(expectedObject);
        });

        it('should not fire update playhead position when logMpEvent is true', () => {
            const bond = sinon.spy(mp, 'logBaseEvent');

            mpMedia.logPageEvent = true;
            mpMedia.logPlayheadPosition(116);

            expect(
                bond.called,
                'Expected Media event NOT call Updated Playhead Position'
            ).to.eq(false);
        });
    });

    describe('Properties', () => {
        describe('currentPlayheadPosition', () => {
            it('should update via custom attributes', () => {
                expect(mpMedia.getAttributes().playhead_position).equal(0);
                mpMedia.logPlay({ currentPlayheadPosition: 42 });
                expect(mpMedia.getAttributes().playhead_position).equal(42);
            });

            it('should maintain playhead position for every log method', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');
                expect(mpMedia.getAttributes().playhead_position).equal(0);
                mpMedia.logPlayheadPosition(60);

                expect(mpMedia.getAttributes().playhead_position).equal(60);
                expect(
                    bond.args[0][0].playheadPosition,
                    'Logging playhead position should persist'
                ).equal(60);

                mpMedia.logPlay({ currentPlayheadPosition: 97 });

                expect(mpMedia.getAttributes().playhead_position).equal(97);
                expect(
                    bond.args[1][0].playheadPosition,
                    'Passing playhead position as option should persist'
                ).equal(97);

                mpMedia.logPause();
                expect(mpMedia.getAttributes().playhead_position).equal(97);
                expect(
                    bond.args[2][0].playheadPosition,
                    'Playhead position from session should persist'
                ).equal(97);
            });
        });
    });

    describe('Functions', () => {
        describe('#logAdBreakStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adBreak: AdBreak = {
                    id: '08123410',
                    title: 'mid-roll',
                    duration: 10000,
                };

                mpMedia.logAdBreakStart(adBreak);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad Break Start'"
                ).to.eq(MediaEventType.AdBreakStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].adBreak,
                    'Expected valid AdBreak object within payload'
                ).to.eql(adBreak);
            });

            it('should save the ad break to the session', () => {
                const adBreak: AdBreak = {
                    id: '08123410',
                    title: 'mid-roll',
                    duration: 10000,
                };

                mpMedia.logAdBreakStart(adBreak);
                expect(mpMedia.adBreak).to.exist.and.eq(adBreak);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adBreak: AdBreak = {
                    id: '08123410',
                    title: 'mid-roll',
                    duration: 10000,
                };

                const options = {
                    customAttributes: {
                        content_rating: 'epic',
                        additional: {
                            attribute: 'foo',
                        },
                    },
                    currentPlayheadPosition: 32,
                };

                mpMedia.logAdBreakStart(adBreak, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );

                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logAdBreakEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adBreak: AdBreak = {
                    id: '08123410',
                    title: 'mid-roll',
                    duration: 10000,
                };

                mpMedia.adBreak = adBreak;
                mpMedia.logAdBreakEnd();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad Break End'"
                ).to.eq(MediaEventType.AdBreakEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].adBreak,
                    'Expected valid AdBreak object within payload'
                ).to.eql(adBreak);
            });

            it('should clear the ad break in the session', () => {
                const adBreak: AdBreak = {
                    id: '08123410',
                    title: 'mid-roll',
                    duration: 10000,
                };

                mpMedia.adBreak = adBreak;
                mpMedia.logAdBreakEnd();

                expect(mpMedia.adBreak).to.eq(undefined);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logAdBreakEnd(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logAdStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '4423210',
                    advertiser: "Mom's Friendly Robot Company",
                    title: 'What?! Nobody rips off my kids but me!',
                    campaign: 'MomCorp Galactic Domination Plot 3201',
                    duration: 60000,
                    creative: 'A Fishful of Dollars',
                    siteid: 'moms',
                    placement: 0,
                };

                mpMedia.logAdStart(adContent);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad Start'"
                ).to.eq(MediaEventType.AdStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].adContent,
                    'Expected to have a valid Ad Content Payload'
                ).to.eql(adContent);
            });

            it('should save the ad content in the session', () => {
                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.logAdStart(adContent);

                expect(mpMedia.adContent).to.exist.and.eq(adContent);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logAdStart(adContent, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logAdEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.adContent = adContent;
                mpMedia.logAdEnd();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad End'"
                ).to.eq(MediaEventType.AdEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);

                expect(
                    bond.args[0][0].adContent,
                    'Expected valid Ad Content in payload'
                ).to.eql(adContent);
            });

            it('should clear the ad content in the session', () => {
                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.adContent = adContent;
                mpMedia.logAdEnd();

                expect(mpMedia.adContent).to.eq(undefined);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logAdEnd(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logAdSkip', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.adContent = adContent;
                mpMedia.logAdSkip();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad Skip'"
                ).to.eq(MediaEventType.AdSkip);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].adContent,
                    'Expected to have a valid Ad Content Payload'
                ).to.eql(adContent);
            });

            it('should clear the ad content in the session', () => {
                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.adContent = adContent;
                mpMedia.logAdSkip();

                expect(mpMedia.adContent).to.eq(undefined);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logAdSkip(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logAdClick', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                mpMedia.logAdClick(adContent);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Ad Click'"
                ).to.eq(MediaEventType.AdClick);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].adContent,
                    'Expected to have a valid Ad Content Payload'
                ).to.eql(adContent);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const adContent: AdContent = {
                    id: '1121220',
                    advertiser: 'Planet Express',
                    title: 'Good News Everbody!',
                    campaign: 'Omicron Persei 8 Dinner Tours',
                    duration: 60000,
                    creative: "We'll be happy to have you for dinner",
                    siteid: 'op8',
                    placement: 0,
                };

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logAdClick(adContent, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logBufferStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logBufferStart(320, 20, 201);
                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);

                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Buffer Start'"
                ).to.eq(MediaEventType.BufferStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(bond.args[0][0].bufferDuration).to.eq(320);
                expect(bond.args[0][0].bufferPercent).to.eq(20);
                expect(bond.args[0][0].bufferPosition).to.eq(201);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logBufferStart(320, 20, 201, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logBufferEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logBufferEnd(99, 2, 341);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Buffer End'"
                ).to.eq(MediaEventType.BufferEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(bond.args[0][0].bufferDuration).to.eq(99);
                expect(bond.args[0][0].bufferPercent).to.eq(2);
                expect(bond.args[0][0].bufferPosition).to.eq(341);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logBufferEnd(99, 2, 341, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logSeekStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logSeekStart(421);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Seek Start'"
                ).to.eq(MediaEventType.SeekStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(bond.args[0][0].seekPosition).to.eq(421);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logSeekStart(341, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logSeekEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logSeekEnd(999);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Seek End'"
                ).to.eq(MediaEventType.SeekEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(bond.args[0][0].seekPosition).to.eq(999);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logSeekEnd(111, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logPlayheadPosition', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logPlayheadPosition(1234);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Playhead Position'"
                ).to.eq(MediaEventType.UpdatePlayheadPosition);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(bond.args[0][0].playheadPosition).to.eq(1234);
            });
        });

        describe('#LogMediaSessionStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logMediaSessionStart();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Media Start'"
                ).to.eq(MediaEventType.SessionStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logMediaSessionStart(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#LogMediaEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logMediaSessionEnd();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Media End'"
                ).to.eq(MediaEventType.SessionEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logMediaSessionEnd(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logPlay', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logPlay();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Play'"
                ).to.eq(MediaEventType.Play);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };
                mpMedia.logPlay(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logPause', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logPause();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Pause'"
                ).to.eq(MediaEventType.Pause);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };
                mpMedia.logPause(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logMediaContentEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                mpMedia.logMediaContentEnd();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Media Content Start'"
                ).to.eq(MediaEventType.MediaContentEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };
                mpMedia.logMediaContentEnd(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logSegmentStart', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.logSegmentStart(segment);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Segment Start'"
                ).to.eq(MediaEventType.SegmentStart);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].segment,
                    'Expect to have a valid Segment'
                ).to.eql(segment);
            });

            it('should save the segment in the session', () => {
                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.logSegmentStart(segment);

                expect(mpMedia.segment).to.exist.and.eq(segment);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };
                mpMedia.logSegmentStart(segment, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logSegmentEnd', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.segment = segment;
                mpMedia.logSegmentEnd();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Segment End'"
                ).to.eq(MediaEventType.SegmentEnd);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].segment,
                    'Expect to have a valid Segment'
                ).to.eql(segment);
            });

            it('should clear the segment in the session', () => {
                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.segment = segment;
                mpMedia.logSegmentEnd();

                expect(mpMedia.segment).to.eq(undefined);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logSegmentEnd(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });

        describe('#logSegmentSkip', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.segment = segment;
                mpMedia.logSegmentSkip();

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'Segment Skip'"
                ).to.eq(MediaEventType.SegmentSkip);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].segment,
                    'Expect to have a valid Segment'
                ).to.eql(segment);
            });

            it('should clear the segment in the session', () => {
                const segment: Segment = {
                    title: 'The Gang Write Some Code',
                    index: 4,
                    duration: 36000,
                };

                mpMedia.segment = segment;
                mpMedia.logSegmentSkip();

                expect(mpMedia.segment).to.eq(undefined);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const options = {
                    currentPlayheadPosition: 32,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };
                mpMedia.logSegmentSkip(options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );
                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    32
                );
            });
        });
        describe('#logQoS', () => {
            it('should call core.logBaseEvent with a valid payload', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const qos: QoS = {
                    startupTime: 201,
                    fps: 42,
                    bitRate: 2,
                    droppedFrames: 3,
                };

                mpMedia.logQoS(qos);

                expect(
                    bond.called,
                    'Expected logBaseEvent to have been called'
                ).to.eq(true);
                expect(
                    bond.args[0][0].eventType,
                    "Expected Event to be of type 'QoS'"
                ).to.eq(MediaEventType.UpdateQoS);
                expect(
                    bond.args[0][0].messageType,
                    "Expected Event to have a messageType of 'Media'"
                ).to.eq(MessageType.Media);
                expect(
                    bond.args[0][0].qos,
                    'Expect to have a valid QoS object'
                ).to.eql(qos);
            });

            it('accepts optional parameters', () => {
                const bond = sinon.spy(mp, 'logBaseEvent');

                const qos: QoS = {
                    startupTime: 201,
                    fps: 42,
                    bitRate: 2,
                    droppedFrames: 3,
                };

                const options = {
                    currentPlayheadPosition: 42,
                    customAttributes: {
                        content_rating: 'epic',
                    },
                };

                mpMedia.logQoS(qos, options);

                expect(bond.args[0][0].options.customAttributes).to.eq(
                    options.customAttributes
                );

                expect(bond.args[0][0].options.currentPlayheadPosition).to.eq(
                    options.currentPlayheadPosition
                );
            });
        });

        describe('#createPageEvent', () => {
            it('should trigger a custom event', () => {
                const customEvent = mpMedia.createPageEvent('Milestone', {
                    reached: '95%',
                    integerValue: 201,
                });

                expect(customEvent).to.eql({
                    name: 'Milestone',
                    messageType: MessageType.PageEvent,
                    eventType: EventType.Media,
                    data: {
                        content_title: 'Immigrant Song',
                        content_id: '023134',
                        content_duration: 120000,
                        content_type: 'Video',
                        stream_type: 'OnDemand',
                        media_session_id: '', // Media Session ID is a blank uuid that gets set on Media Session Start
                        playhead_position: 0,
                        reached: '95%',
                        integerValue: 201,
                    },
                });
            });
        });
    });
});
