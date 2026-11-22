import { ApplicationFailure } from '@temporalio/client';
import type { StorytellerDistributedControlActivities } from '@offscreen/workflows/contracts';
import type { StorytellerPublicationClient } from '../custody/storyteller-publication-client';
import { StorytellerPublicationTransportError } from '../custody/storyteller-publication-client';

export function createStorytellerDistributedControlActivities(
  publication: StorytellerPublicationClient,
): StorytellerDistributedControlActivities {
  return {
    async publishSavedStoryteller(generationId: string): Promise<void> {
      let response;
      try {
        response = await publication.publish(generationId);
      } catch (error) {
        if (error instanceof StorytellerPublicationTransportError) {
          if (error.code === 'unavailable') {
            throw ApplicationFailure.retryable(
              error.message,
              'PublicationUnavailable',
            );
          }
          throw ApplicationFailure.nonRetryable(
            error.code,
            'PublicationTransport',
          );
        }
        throw error;
      }
      switch (response.status) {
        case 'published':
        case 'already_published':
          return;
        case 'stale':
          throw ApplicationFailure.nonRetryable('stale', 'PublicationStale');
        case 'blocked':
          if (response.reason === 'pending-consequence-not-settled') {
            throw ApplicationFailure.retryable(
              response.reason,
              'PublicationPendingSettlement',
            );
          }
          throw ApplicationFailure.nonRetryable(
            response.reason,
            'PublicationBlocked',
          );
        case 'refused':
          throw ApplicationFailure.nonRetryable(
            response.reason,
            'PublicationRefused',
          );
        default: {
          const _exhaustive: never = response;
          throw ApplicationFailure.nonRetryable(
            'invalid-publish-response',
            'PublicationTransport',
          );
        }
      }
    },
  };
}
