/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PostAspectRatio = '1:1' | '4:5' | '16:9' | 'auto';

export interface SocialMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  aspectRatio?: PostAspectRatio;
  altText?: string;
  fileSize?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question?: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt: string;
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorBadge?: 'verified' | 'creator' | 'pro';
  content: string;
  createdAt: string;
  timestamp: number;
  likesCount: number;
  isLiked?: boolean;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorBadge?: 'verified' | 'creator' | 'pro';
  content: string;
  createdAt: string;
  timestamp: number;
  likesCount: number;
  isLiked?: boolean;
  replies: CommentReply[];
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorBadge?: 'verified' | 'creator' | 'pro';
  createdAt: string;
  timestamp: number;
  caption: string; // tweet text
  media: SocialMediaItem[];
  aspectRatio?: PostAspectRatio;
  location?: string;
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  commentsCount: number;
  sharesCount: number;
  repostsCount?: number;
  isReposted?: boolean;
  repostedBy?: {
    id: string;
    name: string;
    handle: string;
  };
  quotedPost?: SocialPost;
  replyToId?: string;
  replyToHandle?: string;
  poll?: Poll;
  comments: PostComment[];
}

export interface SocialUserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  badge?: 'verified' | 'creator' | 'pro';
  role?: 'admin' | 'user';
  location?: string;
  website?: string;
  joinedDate: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
}

export interface TrendingTopic {
  id: string;
  category: string;
  topic: string;
  postsCountFormatted: string;
  tag: string;
}

export interface RecommendedUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  badge?: 'verified' | 'creator' | 'pro';
  bio: string;
  isFollowing: boolean;
}
