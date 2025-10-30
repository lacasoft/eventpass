import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  /**
   * Buscar usuario por email (solo no eliminados)
   * Para incluir eliminados usar: findByEmail(email, true)
   */
  async findByEmail(email: string, withDeleted: boolean = false): Promise<User | null> {
    return this.findOne({
      where: { email },
      withDeleted,
    });
  }

  /**
   * Buscar usuarios activos (solo no eliminados)
   */
  async findActiveUsers(): Promise<User[]> {
    return this.find({
      where: { isActive: true, deletedAt: IsNull() },
    });
  }

  /**
   * Soft delete - marca como eliminado sin borrar físicamente
   */
  async softDeleteUser(user: User): Promise<User> {
    return super.softRemove(user);
  }

  /**
   * Restaurar usuario eliminado
   */
  async restoreUser(id: string): Promise<void> {
    await super.restore(id);
  }

  /**
   * Buscar usuarios eliminados
   */
  async findDeleted(): Promise<User[]> {
    return this.find({
      withDeleted: true,
      where: { deletedAt: IsNull() },
    });
  }
}
