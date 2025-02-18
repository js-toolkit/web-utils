import { EventEmitter } from '@js-toolkit/utils/EventEmitter';
import { getErrorMessage } from '@js-toolkit/utils/getErrorMessage';
import { hasIn } from '@js-toolkit/utils/hasIn';
import log from '@js-toolkit/utils/log';
import * as sdpUtils from './sdputils';

export class PeerConnection
  extends EventEmitter<PeerConnection.EventMap, PeerConnection>
  implements Disposable
{
  // eslint-disable-next-line class-methods-use-this
  get Events(): typeof PeerConnection.Events {
    return PeerConnection.Events;
  }

  readonly logger;
  private pc: RTCPeerConnection;

  constructor(readonly options: PeerConnection.Options = {}) {
    super();
    this.logger = options.logger ?? log.getLogger('PeerConnection');
    this.pc = this.createPC();
  }

  private clear(): void {
    this.pc.onsignalingstatechange = null;
    this.pc.onconnectionstatechange = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.ontrack = null;
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.onicecandidateerror = null;
  }

  private createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.options.rtc);

    pc.onsignalingstatechange = () => {
      this.logger.debug(`Signaling state changed to: ${pc.signalingState}`);
      if (pc.signalingState === 'closed') {
        this.emit(this.Events.Closed);
        this.clear();
      }
    };

    if (hasIn(RTCPeerConnection.prototype, 'onconnectionstatechange')) {
      pc.onconnectionstatechange = () => {
        this.logger.debug(`Connection state changed to: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') this.emit(this.Events.Connected);
        else if (pc.connectionState === 'disconnected') this.emit(this.Events.Disconnected);
      };
    } else {
      pc.oniceconnectionstatechange = () => {
        this.logger.debug(`ICE connection state changed to: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected') this.emit(this.Events.Connected);
        else if (pc.iceConnectionState === 'disconnected') this.emit(this.Events.Disconnected);
      };
    }

    // All tracks must be in one stream for controlling adding/removing tracks.
    pc.ontrack = ({ streams, track }) => {
      this.logger.debug('Remote stream received.', streams.length, track.kind);
      if (streams.length === 0) return;
      const [stream] = streams;
      stream.onremovetrack = () => {
        this.logger.debug('onremovetrack');
        this.emit(this.Events.RemoteStreamChanged, stream);
      };
      stream.onaddtrack = () => {
        this.logger.debug('onaddtrack');
        this.emit(this.Events.RemoteStreamChanged, stream);
      };
      // stream.oninactive = () => {
      //   this.logger.debug('oninactive');
      // };
      this.emit(this.Events.RemoteStreamChanged, stream);
    };

    pc.onnegotiationneeded = () => {
      // When media stream is changed we should re-communicate.
      const { iceConnectionState: state } = pc;
      if (state === 'connected' || state === 'completed') {
        this.logger.debug('Reinitializing connection...');
        this.emit(this.Events.ReinitializingConnectionRequired);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) {
        // End of candidates.
        this.emit(this.Events.EndOfIceCandidates);
        return;
      }
      if (!sdpUtils.isValidIceCandidate(candidate)) return;
      this.emit(this.Events.LocalIceCandidate, candidate);
      // this.logger.debug(`New ICE candidate: ${JSON.stringify(candidate)}`);
    };

    pc.onicecandidateerror = (event) => {
      if (event instanceof RTCPeerConnectionIceErrorEvent) {
        const { errorCode, errorText, hostCandidate, url } = event as typeof event & {
          hostCandidate: string;
        };
        this.logger.warn(
          `ICE candidate error: errorCode=${errorCode}, errorText=${errorText}, hostCandidate=${hostCandidate}, url=${url}`
        );
      } else {
        this.logger.warn(`ICE candidate error: ${getErrorMessage(event)}`);
      }
    };

    return pc;
  }

  private async setLocalDescription(
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const newDesc = sdpUtils.prepareLocalDescription(desc, this.options.codecs);
    await pc.setLocalDescription(newDesc);
    return newDesc;
  }

  private async setRemoteDescription(
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const newDesc = sdpUtils.prepareRemoteDescription(desc, this.options.codecs);
    await pc.setRemoteDescription(newDesc);
    return newDesc;
  }

  isConnected(): boolean {
    return this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed';
  }

  isClosed(): boolean {
    return this.pc.signalingState === 'closed';
  }

  /** Add icecandidate when the clients is exchanging icecandidates. */
  addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate): Promise<void> {
    return this.pc.addIceCandidate(candidate);
  }

  /** Add stream to the remote peer if needed. */
  attachStream(stream: MediaStream): void {
    const senders = this.pc.getSenders();
    // Get tracks which not existed in peer connection.
    const newTracks = senders.length
      ? stream.getTracks().filter((t) => !senders.find(({ track }) => !!track && track.id === t.id))
      : stream.getTracks();
    // If connection has already attached tracks then not possible attach tracks again.
    if (!newTracks.length) {
      this.logger.debug('No tracks to attach to a peer connection.');
      return;
    }
    newTracks.forEach((track) => this.pc.addTrack(track, stream));
    this.logger.debug(`Attached ${newTracks.length} track(s) to a peer connection.`);
  }

  /**
   * Remove ended tracks and unknown tracks and invoke `attachStream`.
   * If stream is not passed then all tracks will be removed.
   */
  reattachStream(stream: MediaStream | undefined): void {
    // Reattach only if connected or just created
    const state = this.pc.iceConnectionState;
    if (state !== 'new' && state !== 'connected' && state !== 'completed') return;

    // Remove diff tracks from connection
    // If do not remove tracks then they are piling up on the remote client (in received stream).
    // The removing track must by in `ended` readyState.
    const tracks = stream ? stream.getTracks() : [];
    this.pc.getSenders().forEach((s) => {
      const { track } = s;
      if (track && (track.readyState === 'ended' || !tracks.find((_) => _.id === track.id))) {
        this.pc.removeTrack(s);
        this.logger.debug(`'${track && track.kind}' track is removed from a peer connection.`);
      }
    });

    if (stream) this.attachStream(stream);
  }

  /** A call to establish a connection. */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const desc = await this.pc.createOffer(this.options.offerOptions);
    // this.logger.debug(`Offer created with: ${JSON.stringify(options)}`);
    return this.setLocalDescription(this.pc, desc);
  }

  /** A call from another client which received an offer. */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.setRemoteDescription(this.pc, offer);
    const desc = await this.pc.createAnswer(this.options.offerOptions);
    return this.setLocalDescription(this.pc, desc);
  }

  /** Apply answer from another client after calling `createOffer`. */
  applyAnswer(remoteDesc: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    return this.setRemoteDescription(this.pc, remoteDesc);
  }

  reconnect(): void {
    this.close();
    this.pc = this.createPC();
  }

  /** After calling this method the connection can no longer be used unless `reconnect` will be called. */
  close(): void {
    this.pc.close();
    // The event is not fired if close manually
    if (this.pc.onsignalingstatechange) {
      this.emit(this.Events.Closed);
      this.clear();
    }
  }

  destroy(): void {
    this.close();
    this.removeAllListeners();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PeerConnection {
  export interface Options {
    readonly offerOptions?: RTCOfferOptions;
    readonly rtc?: RTCConfiguration;
    readonly codecs?: sdpUtils.PreferCodecs;
    readonly logger?: Pick<log.Logger, 'debug' | 'warn'> | undefined;
    readonly id?: string;
  }

  export enum Events {
    /** IceCandidate for exchanging. */
    LocalIceCandidate = 'LocalIceCandidate',
    EndOfIceCandidates = 'EndOfIceCandidates',
    /** The connection is established. */
    Connected = 'Connected',
    /** The remote client closed a connection or connection is failed. */
    Disconnected = 'Disconnected',
    RemoteStreamChanged = 'RemoteStreamChanged',
    ReinitializingConnectionRequired = 'ReinitializingConnectionRequired',
    Closed = 'Closed',
  }

  export type EventMap = EventEmitter.EventMap<
    DefineAll<
      Events,
      {
        [Events.LocalIceCandidate]: [RTCIceCandidate];
        [Events.EndOfIceCandidates]: [];
        [Events.Connected]: [];
        [Events.Disconnected]: [];
        [Events.RemoteStreamChanged]: [MediaStream];
        [Events.ReinitializingConnectionRequired]: [];
        [Events.Closed]: [];
      }
    >,
    PeerConnection
  >;

  export type EventHandler<T extends Events = Events> = EventEmitter.EventListener<
    EventMap,
    T,
    PeerConnection
  >;

  export type EventHandlerMap<T extends Events = Events> = { [P in T]: EventHandler<P> };
}
